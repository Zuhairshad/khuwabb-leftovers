// Image helpers for the preview mock: real dimensions and pre-sized variants.
// - imageSize(file): width/height read from the file header (png / jpeg / webp / gif), cached.
// - imageObject(url): a Shopify-like image object for a /public URL ({src,url,width,height,aspect_ratio,alt}).
// - pickVariant(url, width): for `image_url: width: N`, the smallest pre-sized file in
//   data/image-sizes.json (the -360h/-480h/-640h/-NNNw files in public/) that is at least N px wide.
import { readFileSync, existsSync, openSync, readSync, closeSync } from "node:fs"
import { resolve, extname } from "node:path"
import { ROOT } from "../store-setup/lib/data.mjs"

const sizeCache = new Map()

function readHead(file, n = 65536) {
  const fd = openSync(file, "r")
  try {
    const buf = Buffer.alloc(n)
    const got = readSync(fd, buf, 0, n, 0)
    return buf.subarray(0, got)
  } finally {
    closeSync(fd)
  }
}

export function parseDims(b) {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) } // PNG IHDR
  if (b.length > 10 && b.toString("ascii", 0, 3) === "GIF") return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) }
  if (b[0] === 0xff && b[1] === 0xd8) {
    // JPEG: walk markers to the first SOFn
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue }
      const m = b[i + 1]
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) }
      i += 2 + b.readUInt16BE(i + 2)
    }
    return null
  }
  if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const t = b.toString("ascii", 12, 16)
    if (t === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) }
    if (t === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff }
    if (t === "VP8L") { const v = b.readUInt32LE(21); return { width: (v & 0x3fff) + 1, height: ((v >> 14) & 0x3fff) + 1 } }
  }
  return null
}

/** Absolute file path for a URL like /products/x/front.webp (served from public/). */
export const publicFile = (url) => resolve(ROOT, "public", decodeURIComponent(String(url).split("?")[0]).replace(/^\/+/, "").replace(/\.\./g, ""))

export function imageSize(file) {
  if (sizeCache.has(file)) return sizeCache.get(file)
  let d = null
  try { if (existsSync(file)) d = parseDims(readHead(file)) } catch { /* unreadable: no dims */ }
  sizeCache.set(file, d)
  return d
}

export function imageObject(url, alt = "", id = 0) {
  const u = String(url).split("?")[0]
  const d = imageSize(publicFile(u))
  if (!d) return null
  return { id, src: u, url: u, width: d.width, height: d.height, alt, aspect_ratio: d.width / d.height }
}

let variants
const variantTable = () => (variants ??= JSON.parse(readFileSync(resolve(ROOT, "data/image-sizes.json"), "utf8")))

/** Smallest pre-sized file at least `width` px wide, else the original url. */
export function pickVariant(url, width) {
  const w = Number(width)
  if (!w) return url
  const list = variantTable()[url]
  if (!list) return url
  const fit = list.filter((v) => v.w >= w && existsSync(publicFile(v.src))).sort((a, b) => a.w - b.w)[0]
  return fit ? fit.src : url
}

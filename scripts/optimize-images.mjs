// Makes right-sized WebP copies of the site's photos for responsive srcsets.
//
//   node scripts/optimize-images.mjs
//
// Outputs sit next to the source as <name>-<width>w.webp (or -<height>h for
// product cut-outs) and data/image-sizes.json maps each source path to its
// variants: { "/brand/collections.jpg": [{ src, w, h }, ...] }.
// Encoding runs in headless Chromium (canvas → WebP), so colours go through
// the same decoder browsers use; quality stays high (0.84) for garments.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "playwright"

const PUB = "public"
const Q = 0.84

// [source, target widths]
const PHOTOS = [
  ["/brand/collections.jpg", [640, 960, 1280, 1849]],
  ["/brand/wear-the-dream.jpg", [640, 960, 1280, 1672]],
  ...readdirSync(`${PUB}/brand/looks`).filter((f) => f.endsWith(".jpg")).map((f) => [`/brand/looks/${f}`, [400, 640, 960]]),
  ["/framer/images/YiUnZTXr74PD1drE1Th6MZvyUj4.0cgnl3i.png", [400, 819]], // New In header
  ["/framer/images/YiUnZTXr74PD1drE1Th6MZvyUj4.1i1xfkl.png", [320]], // empty bag
]
// Intro overlay frames: shown at most ~250×345 CSS px.
const intro = JSON.parse(readFileSync("data/scoop-intro.json", "utf8"))
// They flash past during the spin, so a light 240px copy is plenty.
for (const src of new Set(intro.images)) PHOTOS.push([src, [240], 0.72])

// Product cut-outs: a small height for cards, reels and thumbnails; the
// 1100px original stays for the product page at large sizes.
const CUTOUT_HEIGHTS = [360, 480, 640]
const cutouts = []
for (const slug of readdirSync(`${PUB}/products`)) {
  if (!statSync(`${PUB}/products/${slug}`).isDirectory()) continue
  for (const colour of readdirSync(`${PUB}/products/${slug}`))
    for (const view of ["front", "side", "back", "piece-top", "piece-bottom"]) {
      const p = `/products/${slug}/${colour}/${view}.webp`
      if (existsSync(PUB + p)) cutouts.push(p)
    }
}

const browser = await chromium.launch()
const page = await browser.newPage()

async function resize(src, box, quality = Q) {
  const buf = readFileSync(PUB + src)
  const type = src.endsWith(".png") ? "png" : src.endsWith(".webp") ? "webp" : "jpeg"
  return page.evaluate(
    async ({ data, box, q }) => {
      const img = new Image()
      img.src = data
      await img.decode()
      const s = box.w ? Math.min(1, box.w / img.width) : Math.min(1, box.h / img.height)
      const w = Math.round(img.width * s)
      const h = Math.round(img.height * s)
      const c = new OffscreenCanvas(w, h)
      const x = c.getContext("2d")
      x.imageSmoothingQuality = "high"
      x.drawImage(img, 0, 0, w, h)
      const blob = await c.convertToBlob({ type: "image/webp", quality: q })
      const b = new Uint8Array(await blob.arrayBuffer())
      let bin = ""
      for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000))
      return { b64: btoa(bin), w, h, ow: img.width, oh: img.height }
    },
    { data: `data:image/${type};base64,${buf.toString("base64")}`, box, q: quality },
  )
}

const out = {}
let bytesIn = 0
let bytesOut = 0
for (const [src, widths, q] of PHOTOS) {
  const base = src.replace(/\.(png|jpe?g|webp)$/, "")
  out[src] = []
  bytesIn += statSync(PUB + src).size
  for (const w of widths) {
    const r = await resize(src, { w }, q)
    if (out[src].some((v) => v.w === r.w)) continue
    const file = `${base}-${r.w}w.webp`
    writeFileSync(PUB + file, Buffer.from(r.b64, "base64"))
    out[src].push({ src: file, w: r.w, h: r.h })
    bytesOut += statSync(PUB + file).size
  }
}
for (const src of cutouts) {
  const base = src.replace(/\.webp$/, "")
  const full = await resize(src, { h: 99999 })
  out[src] = []
  for (const h of CUTOUT_HEIGHTS) {
    if (h >= full.oh) continue
    const r = await resize(src, { h })
    const file = `${base}-${r.h}h.webp`
    writeFileSync(PUB + file, Buffer.from(r.b64, "base64"))
    out[src].push({ src: file, w: r.w, h: r.h })
  }
  out[src].push({ src, w: full.ow, h: full.oh })
}
await browser.close()
writeFileSync("data/image-sizes.json", JSON.stringify(out, null, 1) + "\n")
console.log(`${Object.keys(out).length} images; photos ${Math.round(bytesIn / 1024)} KiB → largest-variant set ${Math.round(bytesOut / 1024)} KiB`)

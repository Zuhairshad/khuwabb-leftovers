// Turns the supplied product photos (white studio background) into cut-outs
// that sit on the coloured arches like the original design.
//
//   node scripts/cutout-photos.mjs [--only <folder>]
//
// Reads  <source>/<folder>/<colour>/<front|side|back>.(webp|png) from each
//        source below; a later source replaces an earlier one's photos.
// Writes public/products/<slug>/<colour>/<view>.webp (transparent, trimmed)
//
// The background is removed by flood-filling near-white pixels from the
// image border, so white garments inside the outline are kept. Decoding and
// encoding run in headless Chromium (no native image libraries needed).
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { chromium } from "playwright"

export const FOLDERS = {
  "01-ribbed-drawstring-wide-leg-trouser": "ribbed-drawstring-wide-leg-trouser",
  "02-three-half-stripes-and-panel-trouser": "wide-leg-trouser-three-half-stripes",
  "03-two-full-stripes-trouser": "wide-leg-trouser-two-full-stripes",
  "04-high-waist-wide-leg-jogger": "shape-high-waist-wide-leg-jogger",
  "05-two-full-panels-trouser": "women-trouser-two-full-panels",
  "06-cargo-pocket-trouser": "cargo-pocket-trouser-for-women",
  "07-seam-detail-co-ord": "seam-detail-co-ords-set",
  "08-side-pocket-dress": "womens-side-pocket-cotton-maxi-dress",
  "09-boat-neck-long-sleeve-maxi-dress": "boat-neck-long-sleeve-maxi-dress",
  "10-ladies-vinyl-jacket": "ladies-vinyl-jacket",
  "11-hooded-sleeveless-cropped-jacket": "womens-hooded-sleeveless-cropped-puffer-jacket",
  "12-hooded-full-sleeve-cropped-jacket": "womens-hooded-full-sleeve-cropped-puffer-jacket",
}

// Updated photos supplied later (19 Nov 2026): the vinyl jacket reshoot.
const UPDATES = { "Ladies_Vinyl_Jacket": "ladies-vinyl-jacket" }
const SOURCES = [
  ["Khuwabb_Color_Variants", FOLDERS],
  ["Khuwabb_Lookbook_and_Vinyl_Jacket", UPDATES],
]
// Sets photographed as separate pieces: each view is composed from the
// pieces' cut-outs side by side, like the other co-ord photos. Each studio
// shot fills its frame, so pieces are sized by `heights` (share of the
// tallest piece) rather than their pixel size. [folder, slug, views, heights]
const SETS = [
  ["Khuwabb_Gymwear/gymwear", "gym-co-ords-set", { front: ["top-front.png", "leggings-front.png"], back: ["top-back.png", "leggings-back.png"] }, [0.5, 1]],
]
const OUT = "public/products"
const MAX_H = 1100

async function main() {
  const args = process.argv.slice(2)
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null
  const browser = await chromium.launch()
  const page = await browser.newPage()
  let n = 0
  for (const [root, folders] of SOURCES)
    for (const folder of Object.keys(folders)) {
      if (only && folder !== only) continue
      const slug = folders[folder]
      for (const colour of await readdir(join(root, folder))) {
        if (!(await stat(join(root, folder, colour))).isDirectory()) continue
        for (const file of await readdir(join(root, folder, colour))) {
          const m = /^(front|side|back)\.(webp|png)$/.exec(file)
          if (!m) continue
          const data = `data:image/${m[2]};base64,` + (await readFile(join(root, folder, colour, file))).toString("base64")
          const out = await page.evaluate(cutout, { data, maxH: MAX_H })
          await mkdir(join(OUT, slug, colour), { recursive: true })
          await writeFile(join(OUT, slug, colour, `${m[1]}.webp`), Buffer.from(out, "base64"))
          n++
        }
      }
    }
  for (const [root, slug, views, heights] of SETS) {
    if (only && slug !== only) continue
    for (const colour of await readdir(root)) {
      if (!(await stat(join(root, colour))).isDirectory()) continue
      for (const [view, files] of Object.entries(views)) {
        const parts = []
        for (const f of files) {
          const data = "data:image/png;base64," + (await readFile(join(root, colour, f))).toString("base64")
          parts.push("data:image/png;base64," + (await page.evaluate(cutout, { data, maxH: 1e9, type: "image/png", trim: true })))
        }
        const out = await page.evaluate(compose, { parts, heights, maxH: MAX_H })
        await mkdir(join(OUT, slug, colour), { recursive: true })
        await writeFile(join(OUT, slug, colour, `${view}.webp`), Buffer.from(out, "base64"))
        n++
        // Front pieces on their own too, for the hero outfit reels.
        if (view === "front")
          for (const [k, name] of [[0, "piece-top"], [1, "piece-bottom"]]) {
            const one = await page.evaluate(compose, { parts: [parts[k]], heights: [1], maxH: MAX_H })
            await writeFile(join(OUT, slug, colour, `${name}.webp`), Buffer.from(one, "base64"))
            n++
          }
      }
    }
  }
  await browser.close()
  console.log(`${n} cut-outs written to ${OUT}/`)
}

// Runs in the page.
async function cutout({ data, maxH, type = "image/webp" }) {
  const img = new Image()
  img.src = data
  await img.decode()
  const w = img.width
  const h = img.height
  const c = new OffscreenCanvas(w, h)
  const x = c.getContext("2d")
  x.drawImage(img, 0, 0)
  const im = x.getImageData(0, 0, w, h)
  const d = im.data
  const lo = (i) => Math.min(d[i], d[i + 1], d[i + 2])
  const hi = (i) => Math.max(d[i], d[i + 1], d[i + 2])
  // Background: near-white and neutral, connected to the border.
  const isBg = (p) => {
    const i = p * 4
    return lo(i) >= 247 && hi(i) - lo(i) <= 6
  }
  const bg = new Uint8Array(w * h)
  const stack = []
  for (let X = 0; X < w; X++) stack.push(X, (h - 1) * w + X)
  for (let Y = 0; Y < h; Y++) stack.push(Y * w, Y * w + w - 1)
  while (stack.length) {
    const p = stack.pop()
    if (bg[p] || !isBg(p)) continue
    bg[p] = 1
    const X = p % w
    if (X > 0) stack.push(p - 1)
    if (X < w - 1) stack.push(p + 1)
    if (p >= w) stack.push(p - w)
    if (p < w * (h - 1)) stack.push(p + w)
  }
  // Soft edge: the band just inside the outline (up to 6px - the studio
  // shots carry a light halo around each garment) is a blend of garment and
  // white background. Each band pixel's opacity is worked out against the
  // garment's typical colour deeper inside (median of nearby interior
  // pixels), and its colour is un-mixed from the white. Dark garments lose
  // the light halo; light garments keep a soft, clean edge.
  const BAND = 6
  const dist = new Uint8Array(w * h).fill(255)
  let ring = []
  for (let p = 0; p < w * h; p++) if (bg[p]) dist[p] = 0
  for (let p = 0; p < w * h; p++) {
    if (bg[p]) continue
    const X = p % w
    if ((X > 0 && bg[p - 1]) || (X < w - 1 && bg[p + 1]) || (p >= w && bg[p - w]) || (p < w * (h - 1) && bg[p + w])) {
      dist[p] = 1
      ring.push(p)
    }
  }
  for (let r = 2; r <= BAND; r++) {
    const next = []
    for (const p of ring) {
      const X = p % w
      for (const q of [X > 0 ? p - 1 : -1, X < w - 1 ? p + 1 : -1, p - w, p + w])
        if (q >= 0 && q < w * h && dist[q] === 255) {
          dist[q] = r
          next.push(q)
        }
    }
    ring = next
  }
  let x0 = w, y0 = h, x1 = 0, y1 = 0
  for (let p = 0; p < w * h; p++) {
    const i = p * 4
    if (bg[p]) {
      d[i + 3] = 0
      continue
    }
    const X = p % w
    const Y = (p / w) | 0
    if (dist[p] <= BAND) {
      // Garment colour reference: median of interior pixels within 10px.
      const near = []
      for (let dy = -10; dy <= 10; dy += 2)
        for (let dx = -10; dx <= 10; dx += 2) {
          const xx = X + dx
          const yy = Y + dy
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
          const q = yy * w + xx
          if (dist[q] > BAND) near.push(lo(q * 4))
        }
      near.sort((a, b) => a - b)
      const ref = near.length ? near[near.length >> 1] : 255
      if (ref < 245) {
        const a = Math.min(1, Math.max(0, (255 - lo(i)) / (255 - ref)))
        if (a < 0.02) {
          d[i + 3] = 0
          continue
        }
        for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, (d[i + k] - 255 * (1 - a)) / a))
        d[i + 3] = Math.round(a * 255)
      }
    }
    if (X < x0) x0 = X
    if (X > x1) x1 = X
    if (Y < y0) y0 = Y
    if (Y > y1) y1 = Y
  }
  x.putImageData(im, 0, 0)
  // Trim to the garment with a small margin, then scale down.
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02)
  const sx = Math.max(0, x0 - pad)
  const sy = Math.max(0, y0 - pad)
  const sw = Math.min(w, x1 + pad + 1) - sx
  const sh = Math.min(h, y1 + pad + 1) - sy
  const s = Math.min(1, maxH / sh)
  const o = new OffscreenCanvas(Math.round(sw * s), Math.round(sh * s))
  const ox = o.getContext("2d")
  ox.imageSmoothingQuality = "high"
  ox.drawImage(c, sx, sy, sw, sh, 0, 0, o.width, o.height)
  const blob = await o.convertToBlob({ type, quality: 0.86 })
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ""
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(bin)
}

// Runs in the page: pieces side by side, each scaled to its share of the
// set's height; shorter pieces sit near the top, beside the waistband.
async function compose({ parts, heights, maxH }) {
  const imgs = await Promise.all(
    parts.map(async (src) => {
      const i = new Image()
      i.src = src
      await i.decode()
      return i
    }),
  )
  const H = maxH
  const sized = imgs.map((i, k) => {
    const h = Math.round(H * heights[k])
    return { i, h, w: Math.round((i.width / i.height) * h) }
  })
  const gap = Math.round(H * 0.04)
  const W = sized.reduce((n, p) => n + p.w, 0) + gap * (sized.length - 1)
  const c = new OffscreenCanvas(W, H)
  const x = c.getContext("2d")
  x.imageSmoothingQuality = "high"
  let left = 0
  for (const p of sized) {
    const top = p.h === H ? 0 : Math.round(H * 0.04)
    x.drawImage(p.i, left, top, p.w, p.h)
    left += p.w + gap
  }
  const blob = await c.convertToBlob({ type: "image/webp", quality: 0.86 })
  const b = new Uint8Array(await blob.arrayBuffer())
  let bin = ""
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(bin)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()

// Builds the logo assets from the supplied square logo (white background).
//   node scripts/make-logo.mjs ["Khuwabb logo.png"]
// public/brand/logo.png  — calligraphy + "khuwabb" wordmark (tagline dropped:
//                          unreadable at nav size), for the nav.
// app/icon.png (512), app/apple-icon.png (180) — the calligraphy mark alone,
//                          centred on white, for the favicon / home-screen icon.
import { readFileSync, writeFileSync } from "node:fs"
import { chromium } from "playwright"

const SRC = process.argv[2] ?? "Khuwabb logo.png"
const browser = await chromium.launch()
const page = await browser.newPage()

const out = await page.evaluate(async (src) => {
  const img = new Image()
  img.src = src
  await img.decode()
  const c = new OffscreenCanvas(img.width, img.height)
  const x = c.getContext("2d")
  x.drawImage(img, 0, 0)
  const im = x.getImageData(0, 0, img.width, img.height)
  const d = im.data
  // The paper isn't pure white: un-mix every pixel from the paper tone so
  // the background becomes transparent and the ink keeps its colour.
  const paper = [d[0], d[1], d[2]]
  const ink = (X, Y) => {
    const k = (Y * img.width + X) * 4
    return Math.min(d[k], d[k + 1], d[k + 2]) < 200
  }
  // Ink bands (rows) and the horizontal extent of a row range.
  const bands = []
  let s = -1
  for (let Y = 0; Y < img.height; Y++) {
    let any = false
    for (let X = 0; X < img.width && !any; X++) any = ink(X, Y)
    if (any && s < 0) s = Y
    if (!any && s >= 0) {
      if (Y - s > 2) bands.push([s, Y - 1])
      s = -1
    }
  }
  const extent = (y0, y1) => {
    let a = img.width, b = 0
    for (let Y = y0; Y <= y1; Y++) for (let X = 0; X < img.width; X++) if (inkMask[Y * img.width + X]) { if (X < a) a = X; if (X > b) b = X }
    return [a, b]
  }
  const toPng = async (sx, sy, sw, sh, W, H, pad, fill) => {
    const o = new OffscreenCanvas(W, H)
    const ox = o.getContext("2d")
    if (fill) {
      ox.fillStyle = fill
      ox.fillRect(0, 0, W, H)
    }
    ox.imageSmoothingQuality = "high"
    const scale = Math.min((W - 2 * pad) / sw, (H - 2 * pad) / sh)
    const dw = sw * scale, dh = sh * scale
    ox.drawImage(c, sx, sy, sw, sh, (W - dw) / 2, (H - dh) / 2, dw, dh)
    const b = new Uint8Array(await (await o.convertToBlob({ type: "image/png" })).arrayBuffer())
    let str = ""
    for (let i = 0; i < b.length; i += 0x8000) str += String.fromCharCode(...b.subarray(i, i + 0x8000))
    return btoa(str)
  }
  const inkMask = new Uint8Array(img.width * img.height)
  for (let p = 0; p < inkMask.length; p++) inkMask[p] = ink(p % img.width, (p / img.width) | 0) ? 1 : 0
  for (let p = 0; p < img.width * img.height; p++) {
    const k = p * 4
    let a = 0
    for (let j = 0; j < 3; j++) a = Math.max(a, (paper[j] - d[k + j]) / Math.max(1, paper[j]))
    a = Math.min(1, Math.max(0, a * 1.15))
    for (let j = 0; j < 3; j++) d[k + j] = a > 0 ? Math.max(0, Math.min(255, (d[k + j] - paper[j] * (1 - a)) / a)) : 0
    d[k + 3] = Math.round(a * 255)
  }
  x.putImageData(im, 0, 0)
  // bands: [calligraphy + swoosh, wordmark, tagline]
  const [mark, word] = bands
  const [lx0, lx1] = extent(mark[0], word[1])
  const lw = lx1 - lx0 + 1, lh = word[1] - mark[0] + 1
  const H = 240
  const logo = await toPng(lx0, mark[0], lw, lh, Math.round((lw / lh) * H) + 16, H + 16, 8, null)
  const [mx0, mx1] = extent(mark[0], mark[1])
  const mw = mx1 - mx0 + 1, mh = mark[1] - mark[0] + 1
  const side = Math.max(mw, mh)
  const icon = await toPng(mx0, mark[0], mw, mh, 512, 512, 40, "#fff")
  const apple = await toPng(mx0, mark[0], mw, mh, 180, 180, 16, "#fff")
  return { bands, logo, icon, apple, ratio: lw / lh, side }
}, "data:image/png;base64," + readFileSync(SRC).toString("base64"))

writeFileSync("public/brand/logo.png", Buffer.from(out.logo, "base64"))
writeFileSync("app/icon.png", Buffer.from(out.icon, "base64"))
writeFileSync("app/apple-icon.png", Buffer.from(out.apple, "base64"))
await browser.close()
console.log("bands", JSON.stringify(out.bands), "logo ratio", out.ratio.toFixed(3))

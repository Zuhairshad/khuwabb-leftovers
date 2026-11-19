// Captures the README screenshots from a running site.
//   node scripts/readme-screenshots.mjs [--url https://khuwabb-leftovers.vercel.app]
// Writes docs/screenshots/*.webp (encoded in Chromium, quality 0.82).
import { writeFile } from "node:fs/promises"
import { chromium } from "playwright"

const args = process.argv.slice(2)
const BASE = args.includes("--url") ? args[args.indexOf("--url") + 1] : "https://khuwabb-leftovers.vercel.app"
const OUT = "docs/screenshots"
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch()
async function toWebp(page, png) {
  return page.evaluate(async (b64) => {
    const img = new Image()
    img.src = "data:image/png;base64," + b64
    await img.decode()
    const c = new OffscreenCanvas(img.width, img.height)
    c.getContext("2d").drawImage(img, 0, 0)
    const blob = await c.convertToBlob({ type: "image/webp", quality: 0.82 })
    const b = new Uint8Array(await blob.arrayBuffer())
    let s = ""
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
    return btoa(s)
  }, png.toString("base64"))
}
async function shot(name, path, { width = 1440, height = 900, settle = 7000, section, prep } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width < 600 ? 2 : 1 })
  const page = await ctx.newPage()
  await page.goto(BASE + path, { waitUntil: "networkidle" })
  await wait(settle)
  if (prep) await prep(page)
  let png
  if (section) {
    const el = page.locator(section).first()
    await el.scrollIntoViewIfNeeded()
    await wait(2500)
    png = await el.screenshot()
  } else png = await page.screenshot()
  await writeFile(`${OUT}/${name}.webp`, Buffer.from(await toWebp(page, png), "base64"))
  console.log("✓", name)
  await ctx.close()
}

await shot("home-hero", "/")
await shot("find-your-fit", "/", { section: '[data-section="flavours"]' })
await shot("shop-the-look", "/", { section: '[data-look="daily-edit"]' })
await shot("shop", "/shop", { settle: 5500 })
await shot("product", "/products/gym-co-ords-set?colour=Light%20Pink", { settle: 1500 })
await shot("mobile-hero", "/", { width: 390, height: 844 })
await shot("mobile-product", "/products/ladies-vinyl-jacket?colour=Red", { width: 390, height: 844, settle: 1500 })
await browser.close()

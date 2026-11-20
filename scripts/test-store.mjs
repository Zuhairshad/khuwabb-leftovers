// Behaviour checks for the Khuwabb storefront (Playwright, Chromium).
//
//   node scripts/test-store.mjs [--url http://localhost:3000] [--fixture-url http://localhost:3300] [--vw 1440,390]
//
// --url          the real catalog: nothing may be orderable until confirmed.
// --fixture-url  a dev server started with NEXT_PUBLIC_CATALOG_FIXTURE=orderable
//                (see .env.example) to exercise the bag end to end.
// Screenshots: screenshots-khuwabb/tests/<vw>/<name>.png
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const args = process.argv.slice(2)
const opt = (n) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 ? args[i + 1] : undefined
}
const URL_REAL = opt("url") ?? "http://localhost:3000"
const URL_FIX = opt("fixture-url")
const WIDTHS = (opt("vw") ?? "1440,390").split(",").map(Number)
const OUT = join(fileURLToPath(new URL("../", import.meta.url)), "screenshots-khuwabb", "tests")
const ROUTES = ["/", "/shop", "/new-in", "/products/seam-detail-co-ords-set", "/products/womens-side-pocket-cotton-maxi-dress"]
const PRODUCT = "/products/wide-leg-trouser-two-full-stripes"

const results = []
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok, detail })
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`)
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch()

async function open(base, path, width, init) {
  const height = width < 810 ? 844 : 900
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: width < 810, reducedMotion: "no-preference" })
  if (init) await ctx.addInitScript(init)
  const page = await ctx.newPage()
  const errors = []
  page.on("pageerror", (e) => errors.push(e.message))
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
  const res = await page.goto(base + path, { waitUntil: "networkidle" })
  return { ctx, page, errors, status: res?.status() }
}
const shot = async (page, width, name, fullPage = false) => {
  const dir = join(OUT, String(width))
  await mkdir(dir, { recursive: true })
  await page.screenshot({ path: join(dir, `${name}.png`), fullPage })
}

for (const width of WIDTHS) {
  const tag = `[${width}]`

  // Pages load with their assets, no errors, no sideways scroll.
  for (const route of ROUTES) {
    const { ctx, page, errors, status } = await open(URL_REAL, route, width)
    await wait(4500) // intro overlay
    // Scroll through so lazy and in-view content mounts.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) {
        scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 120))
      }
      scrollTo(0, 0)
    })
    await page.waitForLoadState("networkidle")
    const imgs = await page.evaluate(() =>
      // Lazy images far off screen (e.g. ticker cards still to scroll in)
      // haven't been requested yet; only judge the rest.
      [...document.images]
        .filter((i) => {
          if (i.loading !== "lazy") return true
          const r = i.getBoundingClientRect()
          return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight
        })
        .filter((i) => i.currentSrc && (!i.complete || i.naturalWidth === 0))
        .map((i) => i.currentSrc),
    )
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    check(`${tag} ${route} loads`, status === 200, `HTTP ${status}`)
    check(`${tag} ${route} images load`, imgs.length === 0, imgs.slice(0, 3).join(", "))
    check(`${tag} ${route} no sideways scroll`, overflow <= 0, `overflow ${overflow}px`)
    check(`${tag} ${route} no errors`, errors.length === 0, errors.slice(0, 2).join(" | "))
    await ctx.close()
  }

  // Product names are not clipped where they should show in full.
  for (const [route, sel] of [
    ["/shop", '[data-section="products"] a p:first-child'],
    ["/new-in", '[data-section="new-in-grid"] a p:first-child'],
    [PRODUCT, '[data-section="product"] h1'],
  ]) {
    const { ctx, page } = await open(URL_REAL, route, width)
    await wait(4500)
    const clipped = await page.$$eval(sel, (els) =>
      els.filter((e) => getComputedStyle(e).overflow !== "visible" && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)).map((e) => e.textContent),
    )
    check(`${tag} ${route} names not clipped`, clipped.length === 0, clipped.join(", "))
    await ctx.close()
  }

  // Clicking a product opens its page directly: no intro, nav already shown.
  // Other pages keep the intro.
  {
    const { ctx, page } = await open(URL_REAL, "/shop", width)
    check(`${tag} shop page plays the intro`, (await page.locator("[data-intro]").count()) === 1)
    await wait(4500)
    await page.locator('[data-section="products"] a').first().click()
    await page.waitForURL("**/products/**")
    await wait(150)
    const navOpacity = await page.locator('[data-section="nav"]').evaluate((el) => Number(getComputedStyle(el).opacity))
    check(`${tag} product click: no intro`, (await page.locator("[data-intro]").count()) === 0)
    check(`${tag} product click: nav visible at once`, navOpacity > 0.99, `opacity ${navOpacity}`)
    await shot(page, width, "product-from-click")
    await ctx.close()
  }

  // Phone menu opens and navigates.
  if (width < 810) {
    const { ctx, page } = await open(URL_REAL, "/", width)
    await wait(4500)
    await page.click("[data-menu-toggle]")
    await wait(700)
    await shot(page, width, "menu-open")
    const link = page.getByRole("link", { name: "Shop", exact: true }).first()
    check(`${tag} menu shows Shop link`, await link.isVisible())
    await link.click()
    await page.waitForURL("**/shop")
    check(`${tag} menu navigates to /shop`, page.url().endsWith("/shop"))
    await ctx.close()
  }

  // Category cards: every card has products; desktop hover expands.
  {
    const { ctx, page } = await open(URL_REAL, "/", width)
    await wait(4500)
    await page.locator('[data-section="flavours"]').scrollIntoViewIfNeeded()
    await wait(2500)
    const counts = await page.$$eval("[data-card]", (cards) => cards.map((c) => `${c.getAttribute("data-card")}: ${c.querySelector("p")?.textContent}`))
    check(`${tag} category cards have products`, counts.length === 5 && counts.every((c) => !/: 0 /.test(c)), counts.join("; "))
    if (width >= 1200) {
      await page.hover('[data-card="Jackets"]')
      await wait(1000)
      check(`${tag} hovering Jackets expands it`, (await page.getAttribute('[data-card="Jackets"]', "data-open")) !== null)
    }
    await shot(page, width, "category-cards")
    await page.click('[data-card="Jackets"]')
    await page.waitForURL("**/shop")
    check(`${tag} category card opens /shop`, page.url().endsWith("/shop"))
    await ctx.close()
  }

  // Outfit shuffle: jackets over trousers, a new outfit each spin, look chooser
  // refuses unconfirmed variants.
  {
    const { ctx, page } = await open(URL_REAL, "/", width)
    await wait(6500)
    const tags = async () => (await page.$$eval('[data-section="hero"] [class*="tagName"]', (e) => e.map((x) => x.textContent))).filter(Boolean)
    const before = await tags()
    await page.click("[data-shuffle]")
    await wait(3200)
    const after = await tags()
    await shot(page, width, "shuffle-after")
    check(`${tag} shuffle shows top-row + bottom-row piece, no shoes`, after.length === 2 && /Jacket|Gym/.test(after[0]) && /Trouser|Jogger|Gym/.test(after[1]), after.join(" + "))
    check(`${tag} shuffle changes the outfit`, before[0] !== after[0] && before[1] !== after[1], `${before.join(" + ")} → ${after.join(" + ")}`)
    await page.click("[data-add-look]")
    await wait(300)
    const add = page.locator("[data-look-add]")
    const selects = await page.locator("[data-look-chooser] select").count()
    check(`${tag} look chooser asks colour + size per piece; add waits for sizes`, selects >= 2 && (await add.isDisabled()), `${selects} selects, button "${await add.textContent()}"`)
    await shot(page, width, "look-chooser")
    await ctx.close()
  }

  // Product page: colours and sizes switch; in-stock sizes go to Shopify
  // checkout; sold-out products can't be added.
  {
    const { ctx, page } = await open(URL_REAL, PRODUCT, width)
    await wait(4500)
    const img = page.locator('[data-section="product"] img').first()
    await page.getByRole("button", { name: "Peppercorn" }).click()
    check(`${tag} colour switch shows that colour's photo`, (await img.getAttribute("src")).endsWith("/wide-leg-trouser-two-full-stripes/peppercorn/front.webp"), await img.getAttribute("src"))
    await page.getByRole("button", { name: "back view" }).click()
    check(`${tag} back view shows that colour's back photo`, (await img.getAttribute("src")).endsWith("/peppercorn/back.webp"), await img.getAttribute("src"))
    await page.getByRole("button", { name: "Cherry" }).click()
    check(`${tag} colour switch keeps the chosen view`, (await img.getAttribute("src")).endsWith("/cherry/back.webp"), await img.getAttribute("src"))
    await page.getByRole("button", { name: "M", exact: true }).click()
    const add = page.locator("[data-add-to-bag]")
    check(`${tag} in-stock size can be added`, (await add.isEnabled()) && /Add to bag/.test(await add.textContent()), await add.textContent())
    await shot(page, width, "product-real", true)
    await add.click()
    await wait(900)
    const href = await page.locator("[data-checkout]").getAttribute("href")
    check(`${tag} checkout hands the bag to Shopify`, /^https:\/\/[a-z0-9-]+\.myshopify\.com\/cart\/\d+:1$/.test(href ?? ""), href ?? "no link")
    await shot(page, width, "bag-real")
    await page.goto(URL_REAL + "/products/gym-co-ords-set", { waitUntil: "networkidle" })
    await wait(800)
    const gym = page.locator("[data-add-to-bag]")
    check(`${tag} sold-out product can't be added`, (await gym.isDisabled()) && /Sold out/.test(await gym.textContent()), await gym.textContent())
    await ctx.close()
  }

  // A forged bag entry (e.g. edited localStorage) can't reach checkout.
  {
    const forge = () => localStorage.setItem("khuwabb-bag", JSON.stringify([{ slug: "seek-unisex-co-ords-set", colour: "Green", size: "M", qty: 3 }]))
    const { ctx, page } = await open(URL_REAL, "/shop", width, forge)
    await wait(4500)
    await page.click("[data-bag-button]")
    await wait(800)
    const checkout = page.locator("[data-checkout]")
    check(
      `${tag} forged bag line is blocked`,
      (await page.getByText("Not available to order").count()) > 0 && (await checkout.getAttribute("href")) === null && (await checkout.getAttribute("aria-disabled")) === "true",
    )
    await shot(page, width, "bag-forged")
    await ctx.close()
  }

  // Fixture catalog: the bag end to end.
  if (URL_FIX) {
    const { ctx, page } = await open(URL_FIX, PRODUCT, width)
    await wait(4500)
    await page.getByRole("button", { name: "Cherry" }).click()
    await page.getByRole("button", { name: "L", exact: true }).click()
    await page.click("[data-add-to-bag]")
    await wait(900)
    const drawer = page.locator("[data-bag-drawer]")
    check(`${tag} fixture: add to bag opens bag`, (await drawer.getAttribute("data-open")) !== null)
    check(`${tag} fixture: line shows colour and size`, (await drawer.getByText("Cherry · Size L").count()) === 1)
    await page.getByRole("button", { name: "One more" }).click()
    await wait(300)
    const subtotal = await drawer.locator('[class*="subtotal"] [class*="num"]').textContent()
    check(`${tag} fixture: qty 2 subtotal`, subtotal === "Rs.5,000", subtotal)
    const note = await drawer.locator("[data-checkout-note]").textContent()
    check(`${tag} fixture: checkout stays off until enabled`, /opens soon/.test(note) && (await page.locator("[data-checkout]").getAttribute("href")) === null, note)
    await shot(page, width, "bag-fixture")
    await page.getByRole("button", { name: "Remove" }).click()
    await wait(300)
    check(`${tag} fixture: remove empties bag`, (await drawer.getByText("Your bag is empty.").count()) === 1)

    // Look chooser with orderable variants.
    await page.goto(URL_FIX + "/", { waitUntil: "networkidle" })
    await wait(6500)
    await page.click("[data-add-look]")
    const selects = page.locator("[data-look-chooser] select")
    const n = await selects.count()
    for (let i = 1; i < n; i += 2) await selects.nth(i).selectOption({ index: 1 })
    await page.click("[data-look-add]")
    await wait(900)
    const badge = (await page.locator("[data-bag-button]").innerText()).replace(/\s+/g, " ").trim()
    check(`${tag} fixture: add the look adds both pieces`, badge === "Bag 2 items", badge)
    await shot(page, width, "look-added")
    await ctx.close()
  }
}

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)

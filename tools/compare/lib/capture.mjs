// Per-side page capture: stabilise, run actions, screenshot, read styles.
import { readStyles } from "./styles.mjs"
import { escapeRegExp, fromDiscovered } from "./sections.mjs"

export const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
}

const STABILISE_CSS = `
*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}
#preview-bar-iframe,#PBarNextFrameWrapper,.shopify-section-preview-bar,#shopify-pc__banner,
[id*="cookie" i][role="dialog"],[id*="cookie" i][aria-modal],
[role="dialog"]:not([data-bag-drawer]):not([data-look-chooser]):not([data-bag-drawer] [role="dialog"]),
.skip-link,.skip-to-content-link{display:none!important}
`

// Seed 11 (mapping G23). Math.random and window.reelsRandom get independent
// streams so unrelated Math.random calls cannot shift the reels sequence.
const SEED_SCRIPT = `
(() => {
  const make = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  Math.random = make(11)
  window.reelsRandom = make(11)
})()
`

// Force-reveal (on by default, --no-force-reveal disables). Scroll reveals (framer
// whileInView / the theme's appear.js) hide content until an IntersectionObserver reports it
// in view, and replay on exit. Instead of overriding inline opacity/transform (which would
// lose resting poses such as CareLabels' tilt, and would touch semantic hidden states), every
// IntersectionObserver is replaced by one that reports each observed element as fully
// intersecting once, right after observe(). The page's own code then animates to its real end
// state and never replays. Semantic states (closed drawers, inactive cards, scroll-linked
// opacity, hover/click state) are driven by other code and stay untouched. Installed before
// any page script via addInitScript.
const FORCE_REVEAL_SCRIPT = `
(() => {
  const Real = window.IntersectionObserver
  if (!Real || window.__forceReveal) return
  window.__forceReveal = true
  function FakeIO(cb, opts) {
    const els = new Set()
    this.root = (opts && opts.root) || null
    this.rootMargin = (opts && opts.rootMargin) || "0px"
    this.thresholds = [].concat((opts && opts.threshold) || 0)
    this.observe = (el) => {
      if (els.has(el)) return
      els.add(el)
      setTimeout(() => {
        if (!els.has(el)) return
        const r = el.getBoundingClientRect()
        cb([{ target: el, isIntersecting: true, intersectionRatio: 1, time: performance.now(), boundingClientRect: r, intersectionRect: r, rootBounds: null }], this)
      }, 0)
    }
    this.unobserve = (el) => els.delete(el)
    this.disconnect = () => els.clear()
    this.takeRecords = () => []
  }
  FakeIO.prototype = Real.prototype
  window.IntersectionObserver = FakeIO
})()
`

// Fallback for the theme: make sure every [data-appear] carries [data-shown].
const SHOW_APPEAR_FN = () => {
  for (const el of document.querySelectorAll("[data-appear]:not([data-shown])")) el.setAttribute("data-shown", "")
}

const merge = (action, side) => ({ ...action, ...(action[side] || {}) })

async function settle(page, ms) {
  await page.waitForTimeout(ms)
}

export async function stabilise(page, settleMs, side, forceReveal = true) {
  await page.addStyleTag({ content: STABILISE_CSS }).catch(() => {})
  if (forceReveal) await page.evaluate(SHOW_APPEAR_FN).catch(() => {})
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {})
  await page
    .waitForFunction(
      (side) => {
        // theme: html[data-intro-playing] is set while the intro runs (overlay keeps data-intro)
        if (side === "theme" && !document.documentElement.hasAttribute("data-intro-playing")) return true
        const el = document.querySelector("[data-intro]")
        if (!el) return true
        const cs = getComputedStyle(el)
        return cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0"
      },
      side,
      { timeout: 8000 },
    )
    .catch(() => {})
  await settle(page, settleMs)
}

/** Scroll down and back so lazy images load before screenshots. */
async function warmScroll(page) {
  await page
    .evaluate(async () => {
      const step = Math.max(400, innerHeight * 0.8)
      for (let y = 0; y < document.documentElement.scrollHeight && y < 40000; y += step) {
        scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 60))
      }
      scrollTo(0, 0)
    })
    .catch(() => {})
}

/**
 * Click, then wait for `until` (a selector that must appear); if it doesn't, click again.
 * Early clicks can land before React hydration (no handler yet), so retry for ~8s.
 * A toggle that already reached `until` is never clicked again.
 */
async function clickUntil(page, selector, until) {
  const loc = page.locator(selector).first()
  if (!until) return loc.click({ timeout: 5000 })
  for (let i = 0; i < 10; i++) {
    if (await page.locator(until).first().count()) break
    await loc.click({ timeout: 5000 }).catch(() => {})
    await page.waitForSelector(until, { timeout: 800, state: "attached" }).catch(() => {})
  }
  await page.waitForSelector(until, { timeout: 2000, state: "attached" })
}

/** Wait until the first matching element has a box that lies inside the viewport. */
async function waitInViewport(page, selector) {
  await page
    .waitForFunction(
      (sel) => {
        const el = document.querySelector(sel)
        if (!el) return false
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0 && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1
      },
      selector,
      { timeout: 4000 },
    )
    .catch(() => {})
}

async function runAction(page, raw, side) {
  const a = merge(raw, side)
  switch (a.type) {
    case "click":
      await clickUntil(page, a.selector, a.until)
      break
    case "hover":
      await page.locator(a.selector).first().hover({ timeout: 5000 })
      break
    case "selectVariant": {
      const product = page.locator('[data-section="product"]').first()
      const pick = (v) =>
        product.locator('button, [role="radio"], label').filter({ hasText: new RegExp("^\\s*" + escapeRegExp(v) + "\\s*$") }).first()
      if (a.colour) await pick(a.colour).click({ timeout: 5000 })
      if (a.size) await pick(a.size).click({ timeout: 5000 })
      break
    }
    case "openDrawer":
      await clickUntil(page, "[data-bag-button]", "[data-bag-drawer][data-open]")
      await waitInViewport(page, "[data-bag-drawer] [role=dialog], [data-bag-drawer][role=dialog], [data-bag-drawer] aside")
      break
    case "scroll":
      if (a.selector) await page.locator(a.selector).first().scrollIntoViewIfNeeded({ timeout: 5000 })
      else await page.evaluate((y) => scrollTo(0, y), a.y ?? 0)
      break
    case "wait":
      await page.waitForTimeout(a.ms ?? 500)
      break
    default:
      throw new Error(`unknown action type "${a.type}"`)
  }
}

/**
 * Capture one side. Returns { errors, status, shots: {viewport, full}, styles }.
 * Never throws for page-level problems; they are collected in `errors`.
 */
export async function captureSide({ browser, side, baseUrl, path, vpName, actions, keySelectors, sections, settleMs, forceReveal = true }) {
  const errors = []
  const vp = VIEWPORTS[vpName]
  const context = await browser.newContext({
    ...vp,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    ignoreHTTPSErrors: true,
  })
  const page = await context.newPage()
  const res = { errors, status: null, shots: {}, styles: {}, sections: [] }
  try {
    await page.addInitScript(SEED_SCRIPT)
    if (forceReveal) await page.addInitScript(FORCE_REVEAL_SCRIPT)
    const url = new URL(path, baseUrl).toString()
    const resp = await page.goto(url, { waitUntil: "load", timeout: 45000 })
    res.status = resp ? resp.status() : null
    await stabilise(page, settleMs, side, forceReveal)
    await warmScroll(page)
    await settle(page, 200)
    for (const raw of actions || []) {
      try {
        await runAction(page, raw, side)
        await settle(page, 250)
      } catch (e) {
        errors.push(`${side}: action ${raw.type}${raw.selector ? " " + raw.selector : ""} failed: ${String(e.message).split("\n")[0]}`)
      }
    }
    await stabilise(page, settleMs, side, forceReveal)
    if (forceReveal) await settle(page, 1600) // let the forced reveals finish (longest is 1.4s + delay)
    // Informational only: the ref's whileInView reveals stay hidden in full-page shots.
    res.shots.viewport = await page.screenshot({ fullPage: false })
    res.shots.full = await page.screenshot({ fullPage: true })

    // Per-section pass: scroll into view, wait for in-view reveals, element screenshot,
    // and read key-selector styles for elements inside that section.
    let list = sections
    if (list === null) {
      const names = await page.evaluate(() => [...document.querySelectorAll("[data-section]")].map((e) => e.getAttribute("data-section")))
      list = fromDiscovered(names)
    }
    const pending = new Set(keySelectors.filter((k) => k[side]).map((k) => k.name))
    const readKey = async (k) => {
      res.styles[k.name] = await readStyles(page, k[side])
      res.styles[k.name].selector = k[side]
      pending.delete(k.name)
    }
    for (const k of keySelectors) if (!k[side]) res.styles[k.name] = { found: false, skipped: true, selector: null }
    const hideNav = (hide) =>
      page.evaluate((hide) => {
        const n = document.querySelector('[data-section="nav"]')
        if (n) n.style.visibility = hide ? "hidden" : ""
      }, hide).catch(() => {})
    // Visible = rendered with a non-zero box (closed drawers etc. are display:none / 0x0).
    const isHidden = (sel) =>
      page
        .evaluate((sel) => {
          const el = document.querySelector(sel)
          if (!el) return false
          const r = el.getBoundingClientRect()
          const cs = getComputedStyle(el)
          return r.width === 0 || r.height === 0 || cs.display === "none" || cs.visibility === "hidden"
        }, sel)
        .catch(() => false)
    const reveal = async (sel) => {
      const ok = await page
        .evaluate((sel) => {
          const el = document.querySelector(sel)
          if (!el) return false
          el.scrollIntoView({ block: el.getBoundingClientRect().height > innerHeight ? "start" : "center", inline: "nearest" })
          return true
        }, sel)
        .catch(() => false)
      if (ok) await settle(page, settleMs + 1600)
      return ok
    }
    for (const sec of list) {
      const sel = sec[side]
      if (!sel) continue
      const entry = { name: sec.name, selector: sel, found: false, shot: null }
      res.sections.push(entry)
      try {
        if (await isHidden(sel)) {
          entry.found = true
          entry.hidden = true // not captured (hidden): reported as a note, not an error
          continue
        }
        entry.found = await reveal(sel)
        if (!entry.found) continue
        await hideNav(sec.name !== "nav" && sel !== '[data-section="nav"]')
        entry.shot = await page.locator(sel).first().screenshot({ timeout: 15000 })
        for (const k of keySelectors) {
          if (!pending.has(k.name)) continue
          const inside = await page.evaluate(({ a, b }) => { const e = document.querySelector(a), s = document.querySelector(b); return !!(e && s && s.contains(e)) }, { a: k[side], b: sel }).catch(() => false)
          if (inside) await readKey(k)
        }
      } catch (e) {
        errors.push(`${side}: section ${sec.name}: ${String(e.message).split("\n")[0]}`)
      }
    }
    await hideNav(false)
    // Keys outside any captured section (drawers, etc.): bring into view, settle, read.
    for (const k of keySelectors) {
      if (!pending.has(k.name)) continue
      await reveal(k[side])
      await readKey(k)
    }
  } catch (e) {
    errors.push(`${side}: ${String(e.message).split("\n")[0]}`)
  } finally {
    await context.close().catch(() => {})
  }
  return res
}

/** Normalise keySelectors: string -> {name, ref, theme}. */
export function normaliseKeys(keys = []) {
  return keys.map((k) => (typeof k === "string" ? { name: k, ref: k, theme: k } : { name: k.name || k.ref || k.theme, ref: k.ref ?? null, theme: k.theme ?? null }))
}

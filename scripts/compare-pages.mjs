// Paired visual comparison: the untouched Framer snapshot (:3100) against the
// editable Next.js app (:3000). Same Chromium, same viewport/device settings,
// same scripted actions and the same fake clock on both sides, so tickers and
// transitions are sampled at identical moments.
//
//   node scripts/compare-pages.mjs                      # / at 1440 and 390
//   node scripts/compare-pages.mjs --route /shop --vw 1440,390
//   node scripts/compare-pages.mjs --final              # all routes, all widths
//   node scripts/compare-pages.mjs --only hero,nav      # subset of sections
//   node scripts/compare-pages.mjs --no-interactions --no-sections
//
// Output: screenshots/<route>/<vw>/<section>--<state>--{framer,next}.png
// Animation states also get frame series: <section>--<state>--t0300--{side}.png
import { chromium } from "playwright"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import pngjs from "pngjs"
import { pairFolder } from "./lib/pairs.mjs"
import { RANDOM_STREAMS, routes as routeConfig } from "./compare.config.mjs"

const { PNG } = pngjs

// --pairs-only: rebuild side-by-sides/diff table from existing screenshots.

const ROOT = fileURLToPath(new URL("../", import.meta.url))
const OUT = process.env.OUT_DIR ? join(ROOT, process.env.OUT_DIR) : join(ROOT, "screenshots")
const SIDES = {
  framer: process.env.FRAMER_URL ?? "http://localhost:3100",
  next: process.env.NEXT_URL ?? "http://localhost:3000",
}
const BASE_WIDTHS = [1440, 390]
const FINAL_WIDTHS = [1440, 1199, 809, 639, 539, 390]
const HEIGHT = { desktop: 900, mobile: 844 }
// Fake ms each tile is given in view before capture: longer than the slowest
// entrance (receipts: 1.4s spring + 0.51s delay).
const TILE_SETTLE = 2400

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const list = (v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined)

const final = flag("final")
const routes = list(opt("route")) ?? (final ? Object.keys(routeConfig) : ["/"])
const widths = (list(opt("vw")) ?? (final ? FINAL_WIDTHS : BASE_WIDTHS)).map(Number)
const only = list(opt("only"))
const sideFilter = list(opt("side")) ?? Object.keys(SIDES)
const doSections = !flag("no-sections")
const doInteractions = !flag("no-interactions")
const doFull = !flag("no-full")

const slug = (route) => (route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/\//g, "_"))

// Identical context for both servers: viewport, DPR, touch, UA, motion, locale.
function contextOptions(width) {
  const mobile = width < 810
  return {
    viewport: { width, height: mobile ? HEIGHT.mobile : HEIGHT.desktop },
    deviceScaleFactor: 1,
    isMobile: false, // keep layout viewport == width on both sides
    hasTouch: mobile,
    locale: "en-GB",
    timezoneId: "Europe/London",
    colorScheme: "light",
    reducedMotion: "no-preference",
    serviceWorkers: "block", // f2c-sw.js only maps URLs we already serve locally
  }
}

async function openPage(browser, side, route, width, { settle: doSettle = true } = {}) {
  const context = await browser.newContext(contextOptions(width))
  const page = await context.newPage()
  const problems = []
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`))
  page.on("requestfailed", (r) => problems.push(`requestfailed: ${r.url()}`))
  page.on("response", (r) => r.status() >= 400 && problems.push(`${r.status()}: ${r.url()}`))
  // Fixed start time + controllable timers/rAF so both sides animate in lockstep.
  // Paused fake clock: time only moves through clock.runFor, so real-time
  // waits (and how heavy each page is) never shift animation phase.
  const T0 = new Date("2026-01-01T10:00:00Z").getTime()
  await page.clock.install({ time: T0 })
  await page.clock.pauseAt(T0 + 1)
  // Seeded Math.random. Framer's runtime makes its own random calls, so
  // components listed in RANDOM_STREAMS get a dedicated stream picked by call
  // stack (Framer module file / rebuild function name); the n-th shuffle pick
  // is then the same number on both sides.
  await page.addInitScript(
    ({ seed, streams }) => {
      const make = (seed) => {
        let s = seed >>> 0
        return () => {
          s = (s + 0x6d2b79f5) >>> 0
          let t = s
          t = Math.imul(t ^ (t >>> 15), t | 1)
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }
      }
      const base = make(seed)
      const dedicated = streams.map((s) => ({ markers: s.markers, next: make(s.seed) }))
      Math.random = () => {
        const stack = new Error().stack || ""
        for (const s of dedicated) if (s.markers.some((m) => stack.includes(m))) return s.next()
        return base()
      }
    },
    { seed: Number(process.env.SEED ?? 7), streams: RANDOM_STREAMS },
  )
  await page.goto(SIDES[side] + route, { waitUntil: "load", timeout: 60_000 })
  if (doSettle) await settle(page)
  return { context, page, problems }
}

// Wait for fonts and every <img>, then let animations run to rest.
async function settle(page, ms = 1500) {
  await page.waitForLoadState("networkidle").catch(() => {})
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      [...document.images].map((img) =>
        img.complete ? null : new Promise((r) => img.addEventListener("load", r, { once: true }) || img.addEventListener("error", r, { once: true })),
      ),
    )
  })
  await page.clock.runFor(ms)
}

// IntersectionObserver fires on real rendering frames, motion runs on the fake
// clock: give the renderer a moment, then advance animation time.
// CSS transitions and WAAPI animations run on the real document timeline, not
// the fake clock, so settled states finish them explicitly and infinite loops
// (tickers) are frozen at t=0 on both sides.
async function tick(page, ms, { finish = true } = {}) {
  await page.waitForTimeout(60)
  await page.clock.runFor(ms)
  await page.waitForTimeout(60)
  if (finish) await finishAnimations(page)
}

async function finishAnimations(page) {
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      if (a.timeline !== document.timeline) continue // scroll-driven
      const t = a.effect?.getComputedTiming?.()
      try {
        if (!t || t.iterations === Infinity) {
          a.pause()
          a.currentTime = 0
        } else a.finish()
      } catch {}
    }
  })
  await page.waitForTimeout(30)
}

// Seek every animation started since `since` to `at` ms after the trigger.
async function seekAnimations(page, at) {
  await page.evaluate((at) => {
    for (const a of document.getAnimations()) {
      if (a.timeline !== document.timeline || !a.__cmpNew) continue
      try {
        a.pause()
        a.currentTime = at
      } catch {}
    }
  }, at)
  await page.waitForTimeout(30)
}

async function markExistingAnimations(page) {
  await page.evaluate(() => {
    window.__cmpOld = new Set(document.getAnimations())
    // Tag animations created after this point as they appear.
    const tagNew = () => {
      for (const a of document.getAnimations()) if (!window.__cmpOld.has(a)) a.__cmpNew = true
    }
    window.__cmpTag = tagNew
  })
}

// Walk the page once so lazy images load and run-once entrances fire.
async function revealAll(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const step = page.viewportSize().height / 2
  for (let y = 0; y <= height; y += step) {
    await page.evaluate((y) => window.scrollTo(0, y), y)
    await tick(page, 250)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await settle(page, 300)
  await tick(page, 1500)
}

async function shot(page, file, opts) {
  await page.screenshot({ path: file, animations: "allow", caret: "hide", ...opts })
}

// Hide position:fixed layers (nav, bag button) so they don't repeat on every
// tile. Returns a restore function.
async function hideFixed(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("body *")) {
      if (getComputedStyle(el).position === "fixed" && el.style.visibility !== "hidden") {
        el.dataset.cmpHidden = el.style.visibility || "-"
        el.style.visibility = "hidden"
      }
    }
  })
  return () =>
    page.evaluate(() => {
      for (const el of document.querySelectorAll("[data-cmp-hidden]")) {
        el.style.visibility = el.dataset.cmpHidden === "-" ? "" : el.dataset.cmpHidden
        delete el.dataset.cmpHidden
      }
    })
}

// Capture a document-space rect by scrolling it through the viewport tile by
// tile, so in-view effects that reverse on exit are captured in their shown
// state, then stitch the tiles into one PNG.
async function tiledShot(page, file, rect, { keepFixed = false } = {}) {
  const vw = page.viewportSize().width
  const vh = page.viewportSize().height
  const docH = await page.evaluate(() => document.documentElement.scrollHeight)
  const maxScroll = Math.max(0, docH - vh)
  const x = Math.round(rect.x)
  const width = Math.min(Math.round(rect.width), vw - x)
  const top = Math.round(rect.y)
  const height = Math.round(rect.height)
  const out = new PNG({ width, height })
  const restore = keepFixed ? null : await hideFixed(page)
  for (let y = top; y < top + height; y += vh) {
    const scroll = Math.min(y, maxScroll)
    await page.evaluate((s) => window.scrollTo(0, s), scroll)
    await tick(page, TILE_SETTLE)
    // Mask/background images only load once painted; let them arrive.
    await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(50)
    const offset = y - scroll // tile starts this far down the viewport
    const h = Math.min(vh - offset, top + height - y)
    const buf = await page.screenshot({ animations: "allow", caret: "hide", clip: { x, y: offset, width, height: h } })
    const tile = PNG.sync.read(buf)
    PNG.bitblt(tile, out, 0, 0, Math.min(tile.width, width), Math.min(tile.height, h), 0, y - top)
  }
  if (restore) await restore()
  await writeFile(file, PNG.sync.write(out))
}

// Section box in document coordinates.
async function box(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return null
    return { x: Math.max(0, r.left + scrollX), y: Math.max(0, r.top + scrollY), width: Math.min(r.width, document.documentElement.clientWidth), height: r.height }
  }, selector)
}

async function runAction(page, a) {
  switch (a.do) {
    case "click":
      await page.locator(a.sel).first().click({ force: true, timeout: 5000 })
      break
    case "hover":
      await page.locator(a.sel).first().hover({ force: true, timeout: 5000 })
      break
    case "scrollTo":
      await page.locator(a.sel).first().evaluate((el) => el.scrollIntoView({ block: "start" }))
      break
    case "scrollY":
      await page.evaluate((y) => window.scrollTo(0, y), a.y)
      break
    case "wait":
      await page.clock.runFor(a.ms)
      break
    default:
      throw new Error(`unknown action ${a.do}`)
  }
}

async function captureState(page, side, dir, state, width, problems) {
  const name = state.name
  for (const a of state.setup?.[side] ?? []) await runAction(page, a)
  await tick(page, state.setupWait ?? 400)
  const target = state.capture?.[side] ?? "viewport"
  const capture = async (file) => {
    if (target === "viewport") return shot(page, file)
    // Element captures are about the element: fixed layers (nav) stay out.
    const restore = await hideFixed(page)
    await page.locator(target).first().screenshot({ path: file, animations: "allow" })
    await restore()
  }
  if (state.frames) {
    // The trigger runs once; JS-driven motion advances on the fake clock and
    // WAAPI/CSS animations started by the trigger are paused and seeked to the
    // same instant, so frame N is the same moment on both sides.
    let t = 0
    await markExistingAnimations(page)
    for (const a of state.trigger?.[side] ?? []) await runAction(page, a)
    for (const at of state.frames) {
      await page.clock.runFor(at - t)
      t = at
      await page.evaluate(() => window.__cmpTag())
      await seekAnimations(page, at)
      await capture(join(dir, `${state.section}--${name}--t${String(at).padStart(4, "0")}--${side}.png`))
    }
    await finishAnimations(page)
  } else {
    for (const a of state.trigger?.[side] ?? []) await runAction(page, a)
    await tick(page, state.wait ?? 1200)
  }
  await capture(join(dir, `${state.section}--${name}--${side}.png`))
}

// Page-load animations (the intro): wait for fonts/images without advancing the
// fake clock, then seek every animation to t ms after load.
async function waitAssets(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))))
  })
}

async function captureLoad(page, side, dir, state) {
  await waitAssets(page)
  await page.evaluate(() => {
    window.__cmpOld = new Set()
    window.__cmpTag = () => {
      for (const a of document.getAnimations()) a.__cmpNew = true
    }
  })
  let t = 0
  for (const at of state.frames) {
    await page.clock.runFor(at - t)
    t = at
    await page.evaluate(() => window.__cmpTag())
    await seekAnimations(page, at)
    await shot(page, join(dir, `${state.section}--${state.name}--t${String(at).padStart(4, "0")}--${side}.png`))
  }
}

const report = []

async function run() {
  const browser = await chromium.launch()
  for (const route of routes) {
    const cfg = routeConfig[route]
    if (!cfg) throw new Error(`no config for ${route}`)
    for (const width of widths) {
      const dir = join(OUT, slug(route), String(width))
      await mkdir(dir, { recursive: true })
      const sections = cfg.sections.filter((s) => !only || only.includes(s.name))
      const states = (cfg.states ?? []).filter(
        (s) =>
          (!only || only.includes(s.section)) &&
          (!s.widths || s.widths.some((w) => (w === "mobile" ? width < 810 : w === "desktop" ? width >= 810 : w === "wide" ? width >= 1200 : w === width))),
      )
      for (const side of sideFilter) {
        const tag = `${route} @${width} [${side}]`
        let session
        try {
          session = await openPage(browser, side, route, width)
        } catch (e) {
          report.push(`${tag}: could not open (${e.message.split("\n")[0]})`)
          continue
        }
        const { page, context, problems } = session
        await revealAll(page)

        if (doFull) {
          const docH = await page.evaluate(() => document.documentElement.scrollHeight)
          await tiledShot(page, join(dir, `full--default--${side}.png`), { x: 0, y: 0, width, height: docH })
        }

        if (doSections) {
          for (const s of sections) {
            const sel = s[side]
            if (s.atLoad) {
              // Time-driven sections (the reels) are captured from a fresh load
              // at a fixed fake time, independent of the scroll walk.
              const fresh = await openPage(browser, side, route, width, { settle: false })
              try {
                await waitAssets(fresh.page)
                await tick(fresh.page, s.atLoad)
                if (s.scroll) {
                  // Scroll straight to it (no walk), so time-in-view is identical.
                  const bb = await box(fresh.page, sel)
                  if (bb) await tiledShot(fresh.page, join(dir, `${s.name}--default--${side}.png`), bb)
                  else report.push(`${tag}: section "${s.name}" not found (${sel})`)
                } else {
                  const r = await fresh.page.locator(sel).first().boundingBox()
                  if (r) await shot(fresh.page, join(dir, `${s.name}--default--${side}.png`), { clip: r })
                  else report.push(`${tag}: section "${s.name}" not found (${sel})`)
                }
              } finally {
                await fresh.context.close()
              }
              continue
            }
            const b = sel && (await box(page, sel))
            if (!b) {
              report.push(`${tag}: section "${s.name}" not found (${sel})`)
              continue
            }
            if (s.keepFixed) {
              // Fixed layers (the nav) are captured in place over the top of the page.
              await page.evaluate(() => window.scrollTo(0, 0))
              await tick(page, 600)
              const r = await page.locator(sel).first().boundingBox()
              await shot(page, join(dir, `${s.name}--default--${side}.png`), { clip: r })
            } else await tiledShot(page, join(dir, `${s.name}--default--${side}.png`), b)
          }
        }

        if (doInteractions) {
          for (const state of states) {
            // Fresh page per state so states never leak into each other.
            const fresh = await openPage(browser, side, route, width, { settle: !state.onLoad && !state.atLoad })
            try {
              if (state.onLoad) await captureLoad(fresh.page, side, dir, state)
              else if (state.atLoad) {
                await waitAssets(fresh.page)
                await tick(fresh.page, state.atLoad)
                await captureState(fresh.page, side, dir, state, width, fresh.problems)
              } else {
                await revealAll(fresh.page)
                await captureState(fresh.page, side, dir, state, width, fresh.problems)
              }
            } catch (e) {
              report.push(`${tag}: state ${state.section}/${state.name} failed (${e.message.split("\n")[0]})`)
            } finally {
              problems.push(...fresh.problems)
              await fresh.context.close()
            }
          }
        }

        const uniq = [...new Set(problems)]
        if (uniq.length) report.push(`${tag}: ${uniq.length} console/network problems\n    ${uniq.slice(0, 8).join("\n    ")}`)
        await context.close()
        console.log(`done ${tag}`)
      }
    }
  }
  await browser.close()

  // Side-by-sides + mismatch % for every pair written in this run's folders.
  const table = []
  for (const route of routes)
    for (const width of widths) {
      const dir = join(OUT, slug(route), String(width))
      for (const r of await pairFolder(dir).catch(() => []))
        table.push(`${slug(route).padEnd(7)} ${String(width).padStart(4)}  ${(r.diff === null ? "  -  " : r.diff.toFixed(1).padStart(5) + "%")}  ${r.name}${r.note ? `  (${r.note})` : ""}`)
    }
  await writeFile(join(OUT, "diff-summary.txt"), table.join("\n") + "\n")
  console.log(table.join("\n"))

  const summary = report.length ? report.join("\n") : "no problems"
  await writeFile(join(OUT, "last-run.txt"), `${new Date().toISOString()}\n${args.join(" ")}\n\n${summary}\n`)
  console.log(`\n${summary}\n\nscreenshots in ${OUT}`)
}

if (flag("clean")) await rm(OUT, { recursive: true, force: true })
await run()

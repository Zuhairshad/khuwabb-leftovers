#!/usr/bin/env node
// Visual compare: Next.js reference vs Shopify theme.
// Usage: node run.mjs [page ...] [--viewport desktop|mobile] [--ref-url URL] [--theme-url URL]
//        [--settle ms] [--tolerance px] [--strict] [--headed] [--pages file.json] [--out dir]
import { chromium } from "playwright"
import { mkdir, readFile, writeFile, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { captureSide, normaliseKeys, VIEWPORTS } from "./lib/capture.mjs"
import { compareSelector } from "./lib/styles.mjs"
import { readPng, writePng, sideBySide, diffImages } from "./lib/image.mjs"
import { normaliseSections, unionNames, safeName, sortWorstFirst } from "./lib/sections.mjs"
import { renderReport, consoleTable } from "./lib/report.mjs"

const here = dirname(fileURLToPath(import.meta.url))

function parseArgs(argv) {
  const o = { names: [], strict: false, headed: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const val = () => argv[++i]
    if (a === "--strict") o.strict = true
    else if (a === "--headed") o.headed = true
    else if (a === "--viewport") o.viewport = val()
    else if (a === "--ref-url") o.refUrl = val()
    else if (a === "--theme-url") o.themeUrl = val()
    else if (a === "--settle") o.settle = Number(val())
    else if (a === "--tolerance") o.tolerance = Number(val())
    else if (a === "--pages") o.pages = val()
    else if (a === "--out") o.out = val()
    else if (a.startsWith("--")) throw new Error(`unknown flag ${a}`)
    else o.names.push(a)
  }
  return o
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const refUrl = args.refUrl || process.env.REF_URL || "http://localhost:3000"
  const themeUrl = args.themeUrl || process.env.THEME_URL || "http://127.0.0.1:9292"
  const settleMs = args.settle ?? 500
  const tol = args.tolerance ?? 1
  const outDir = resolve(args.out || join(here, "out"))
  if (args.viewport && !VIEWPORTS[args.viewport]) throw new Error(`--viewport must be one of ${Object.keys(VIEWPORTS).join(", ")}`)

  let pages = JSON.parse(await readFile(resolve(args.pages || join(here, "pages.json")), "utf8"))
  if (args.names.length) {
    const missing = args.names.filter((n) => !pages.some((p) => p.name === n))
    if (missing.length) throw new Error(`unknown page(s): ${missing.join(", ")}. Known: ${pages.map((p) => p.name).join(", ")}`)
    pages = pages.filter((p) => args.names.includes(p.name))
  }

  await mkdir(outDir, { recursive: true })
  const browser = await chromium.launch({ headless: !args.headed, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) })
  const rows = []
  try {
    for (const page of pages) {
      const keys = normaliseKeys(page.keySelectors)
      const sectionCfg = normaliseSections(page.sections)
      const pageTol = page.tolerance ?? tol
      const vps = (page.viewports || ["desktop", "mobile"]).filter((v) => !args.viewport || v === args.viewport)
      for (const vp of vps) {
        console.log(`> ${page.name} [${vp}]`)
        const dir = join(outDir, page.name, vp)
        await rm(dir, { recursive: true, force: true })
        await mkdir(dir, { recursive: true })
        const common = { browser, vpName: vp, actions: page.actions || [], keySelectors: keys, sections: sectionCfg, settleMs }
        const [ref, theme] = await Promise.all([
          page.ref == null ? null : captureSide({ ...common, side: "ref", baseUrl: refUrl, path: page.ref }),
          page.theme == null ? null : captureSide({ ...common, side: "theme", baseUrl: themeUrl, path: page.theme }),
        ])
        const row = {
          page: page.name, viewport: vp, refPath: page.ref, themePath: page.theme,
          refStatus: ref?.status, themeStatus: theme?.status,
          errors: [...(ref?.errors || []), ...(theme?.errors || [])], files: [], selectors: [], diff: null, note: "",
        }
        const files = {}
        for (const [side, r] of [["ref", ref], ["theme", theme]]) {
          if (!r) continue
          if (r.shots.viewport) files[`${side}-viewport.png`] = r.shots.viewport
          if (r.shots.full) files[`${side}-full.png`] = r.shots.full
        }
        if (!ref) row.note = "no reference"
        else if (!theme) row.note = "no theme"
        else if (!ref.shots.full || !theme.shots.full) row.note = "capture failed"
        else {
          const a = readPng(ref.shots.full), b = readPng(theme.shots.full)
          files["side-by-side.png"] = writePng(sideBySide(a, b))
          const d = diffImages(a, b)
          files["diff.png"] = writePng(d.png)
          row.diff = { percent: d.percent, diffPixels: d.diffPixels, sizeRef: d.sizeRef, sizeTheme: d.sizeTheme }
        }
        row.sections = []
        const rs = ref?.sections || [], ts = theme?.sections || []
        for (const name of unionNames(rs, ts)) {
          const r = rs.find((x) => x.name === name), t = ts.find((x) => x.name === name)
          const base = `section-${safeName(name)}`
          const sec = { name, diff: null, note: "", files: [] }
          if (r?.shot) files[`${base}--ref.png`] = r.shot
          if (t?.shot) files[`${base}--theme.png`] = t.shot
          if (r?.shot) sec.files.push(`${base}--ref.png`)
          if (t?.shot) sec.files.push(`${base}--theme.png`)
          if (r?.shot && t?.shot) {
            const a = readPng(r.shot), b = readPng(t.shot)
            files[`${base}--side-by-side.png`] = writePng(sideBySide(a, b))
            const d = diffImages(a, b)
            files[`${base}--diff.png`] = writePng(d.png)
            sec.files.push(`${base}--side-by-side.png`, `${base}--diff.png`)
            sec.diff = { percent: d.percent, sizeRef: d.sizeRef, sizeTheme: d.sizeTheme }
          } else {
            sec.note = !ref ? "no reference" : !theme ? "no theme" : !r ? "missing on ref" : !t ? "missing on theme" : !r.found || !t.found ? `not found on ${!r.found ? "ref" : "theme"}` : "capture failed"
            if (ref && theme && r && !r.found) sec.note = "not found on ref"
            if (ref && theme && t && !t.found) sec.note = "not found on theme"
          }
          row.sections.push(sec)
        }
        row.sections = sortWorstFirst(row.sections)
        for (const [name, buf] of Object.entries(files)) {
          await writeFile(join(dir, name), buf)
          row.files.push(name)
        }
        row.selectors = keys.map((k) => {
          const r = ref?.styles[k.name], t = theme?.styles[k.name]
          const cmp = ref && theme ? compareSelector(r, t, pageTol) : { status: ref || theme ? (ref ? "missing-theme" : "missing-ref") : "missing-both", props: [] }
          return { name: k.name, refSel: k.ref, themeSel: k.theme, ...cmp }
        })
        await writeFile(
          join(dir, "styles.json"),
          JSON.stringify({ ref: ref?.styles ?? null, theme: theme?.styles ?? null, comparison: row.selectors }, null, 2),
        )
        rows.push(row)
      }
    }
  } finally {
    await browser.close()
  }

  const meta = { refUrl, themeUrl, when: new Date().toISOString(), tolerance: tol }
  await writeFile(join(outDir, "report.html"), renderReport(rows, meta))
  consoleTable(rows)
  const issues = rows.reduce((n, r) => n + r.selectors.filter((s) => s.status !== "ok" && !(s.status.startsWith("missing") && (!r.refPath || !r.themePath))).length + r.errors.length, 0)
  console.log(`report: ${join(outDir, "report.html")}  (${issues} issue(s))`)
  if (args.strict && issues > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})

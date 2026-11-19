// Sequential Lighthouse benchmark against a production server.
//
//   node scripts/lighthouse-bench.mjs --label before [--url http://localhost:3400]
//        [--routes /,/shop,...] [--runs 3] [--devices mobile,desktop]
//
// Each run launches a fresh, clean headless Chrome (new temp profile), so no
// cache or storage carries over. Runs never overlap. Raw reports go to
// perf/<label>/<route>--<device>--<n>.json; perf/<label>/summary.{json,md}
// hold the median and range of Performance, LCP, CLS and TBT per route and
// device, plus the LCP element and the top opportunities.
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import * as chromeLauncher from "chrome-launcher"
import lighthouse from "lighthouse"
import desktopConfig from "lighthouse/core/config/desktop-config.js"

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 ? args[i + 1] : d
}
const BASE = opt("url", "http://localhost:3400")
const LABEL = opt("label", "run")
const RUNS = Number(opt("runs", "3"))
const ROUTES = opt("routes", "/,/shop,/new-in,/products/wide-leg-trouser-two-full-stripes").split(",")
const DEVICES = opt("devices", "mobile,desktop").split(",")
// "simulate" (default, what PageSpeed Insights uses) or "devtools" (real
// network/CPU throttling in the browser — a supplementary check).
const THROTTLING = opt("throttling", "simulate")
const OUT = join(fileURLToPath(new URL("../", import.meta.url)), "perf", LABEL)
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

const slug = (r) => (r === "/" ? "home" : r.replace(/^\//, "").replace(/\//g, "_"))
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

await mkdir(OUT, { recursive: true })
const rows = []
for (const route of ROUTES)
  for (const device of DEVICES) {
    const runs = []
    for (let n = 1; n <= RUNS; n++) {
      const chrome = await chromeLauncher.launch({ chromePath: CHROME, chromeFlags: ["--headless=new", "--no-first-run", "--disable-extensions"] })
      try {
        const flags = { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance"], throttlingMethod: THROTTLING }
        const res = await lighthouse(BASE + route, flags, device === "desktop" ? desktopConfig : undefined)
        const lhr = res.lhr
        await writeFile(join(OUT, `${slug(route)}--${device}--${n}.json`), res.report)
        const a = lhr.audits
        const lcpEl = a["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node
        const opps = Object.values(a)
          .filter((x) => x.details?.type === "opportunity" && (x.details.overallSavingsMs ?? 0) > 0)
          .sort((x, y) => y.details.overallSavingsMs - x.details.overallSavingsMs)
          .slice(0, 4)
          .map((x) => `${x.id} (${Math.round(x.details.overallSavingsMs)}ms)`)
        runs.push({
          perf: Math.round((lhr.categories.performance.score ?? 0) * 100),
          lcp: a["largest-contentful-paint"].numericValue,
          cls: a["cumulative-layout-shift"].numericValue,
          tbt: a["total-blocking-time"].numericValue,
          fcp: a["first-contentful-paint"].numericValue,
          si: a["speed-index"].numericValue,
          lcpElement: lcpEl ? `${lcpEl.nodeLabel ?? ""} <${lcpEl.selector ?? ""}>` : "",
          opportunities: opps,
          bytes: a["total-byte-weight"]?.numericValue,
        })
        const r = runs.at(-1)
        console.log(`${route} ${device} #${n}: perf ${r.perf} lcp ${Math.round(r.lcp)} cls ${r.cls.toFixed(3)} tbt ${Math.round(r.tbt)}`)
      } finally {
        await chrome.kill()
      }
    }
    const pick = (k) => runs.map((r) => r[k])
    const stat = (k) => ({ median: median(pick(k)), min: Math.min(...pick(k)), max: Math.max(...pick(k)) })
    rows.push({ route, device, perf: stat("perf"), lcp: stat("lcp"), cls: stat("cls"), tbt: stat("tbt"), fcp: stat("fcp"), si: stat("si"), lcpElement: runs[0].lcpElement, opportunities: runs[0].opportunities, bytes: runs[0].bytes, runs })
  }

const f = (s, d = 0, unit = "") => `${s.median.toFixed(d)}${unit} (${s.min.toFixed(d)}–${s.max.toFixed(d)})`
const md = [
  `# Lighthouse — ${LABEL}`,
  "",
  `${new Date().toISOString()} · ${BASE} · throttling: ${THROTTLING} · Lighthouse ${(await import("lighthouse/package.json", { with: { type: "json" } })).default.version} · ${RUNS} runs each, fresh headless Chrome per run · local production server (not PageSpeed Insights)`,
  "",
  "| Route | Device | Performance | LCP | CLS | TBT | LCP element |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...rows.map((r) => `| ${r.route} | ${r.device} | ${f(r.perf)} | ${f(r.lcp, 0, " ms")} | ${f(r.cls, 3)} | ${f(r.tbt, 0, " ms")} | ${r.lcpElement.replace(/\|/g, "/").slice(0, 90)} |`),
  "",
  "## Top opportunities (run 1)",
  ...rows.map((r) => `- ${r.route} ${r.device}: ${r.opportunities.join(", ") || "none"} · ${Math.round((r.bytes ?? 0) / 1024)} KiB transferred`),
  "",
].join("\n")
await writeFile(join(OUT, "summary.json"), JSON.stringify(rows, null, 2))
await writeFile(join(OUT, "summary.md"), md)
console.log("\n" + md)

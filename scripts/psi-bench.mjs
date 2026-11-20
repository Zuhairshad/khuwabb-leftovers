// PageSpeed Insights (Google's servers) against a public URL, sequential.
//   node scripts/psi-bench.mjs --url https://khuwabb-export-factory-leftovers.vercel.app [--runs 3]
// Raw responses: perf/psi/<route>--<device>--<n>.json; summary in perf/psi/summary.md.
import { mkdir, writeFile } from "node:fs/promises"
const args = process.argv.slice(2)
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d)
const BASE = opt("url")
const RUNS = Number(opt("runs", "3"))
const ROUTES = opt("routes", "/,/shop,/new-in,/products/wide-leg-trouser-two-full-stripes").split(",")
const slug = (r) => (r === "/" ? "home" : r.replace(/^\//, "").replace(/\//g, "_"))
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
await mkdir("perf/psi", { recursive: true })
const rows = []
for (const route of ROUTES)
  for (const strategy of ["mobile", "desktop"]) {
    const runs = []
    for (let n = 1; n <= RUNS; n++) {
      const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(BASE + route)}&strategy=${strategy}&category=performance`
      let j
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(api)
        j = await res.json()
        if (j.lighthouseResult) break
        await new Promise((r) => setTimeout(r, 15000))
      }
      if (!j.lighthouseResult) {
        console.log(`${route} ${strategy} #${n}: error ${JSON.stringify(j.error?.message ?? j).slice(0, 200)}`)
        continue
      }
      await writeFile(`perf/psi/${slug(route)}--${strategy}--${n}.json`, JSON.stringify(j))
      const a = j.lighthouseResult.audits
      const r = { perf: Math.round(j.lighthouseResult.categories.performance.score * 100), lcp: a["largest-contentful-paint"].numericValue, cls: a["cumulative-layout-shift"].numericValue, tbt: a["total-blocking-time"].numericValue }
      runs.push(r)
      console.log(`${route} ${strategy} #${n}: perf ${r.perf} lcp ${Math.round(r.lcp)} cls ${r.cls.toFixed(3)} tbt ${Math.round(r.tbt)}`)
    }
    if (!runs.length) continue
    const st = (k) => ({ median: median(runs.map((r) => r[k])), min: Math.min(...runs.map((r) => r[k])), max: Math.max(...runs.map((r) => r[k])) })
    rows.push({ route, strategy, perf: st("perf"), lcp: st("lcp"), cls: st("cls"), tbt: st("tbt"), n: runs.length })
  }
const f = (s, d = 0, u = "") => `${s.median.toFixed(d)}${u} (${s.min.toFixed(d)}–${s.max.toFixed(d)})`
const md = ["# PageSpeed Insights", "", `${new Date().toISOString()} · ${BASE} · runs per row shown`, "", "| Route | Device | Performance | LCP | CLS | TBT | Runs |", "| --- | --- | --- | --- | --- | --- | --- |", ...rows.map((r) => `| ${r.route} | ${r.strategy} | ${f(r.perf)} | ${f(r.lcp, 0, " ms")} | ${f(r.cls, 3)} | ${f(r.tbt, 0, " ms")} | ${r.n} |`), ""].join("\n")
await writeFile("perf/psi/summary.md", md)
console.log("\n" + md)

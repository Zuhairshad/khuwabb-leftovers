import { chromium } from "playwright"
const b = await chromium.launch(); const p = await b.newPage()
await p.goto("http://localhost:3100/", { waitUntil: "networkidle" })
const r = await p.evaluate(async () => {
  const base = "/assets/framerusercontent.com/sites/1Xvz0Cb2wdza4M00qe9Tp6/"
  const out = {}
  const lib = await import(base + "shared-lib.Dw2ydB0E.mjs")
  for (const [name, f] of [["looks", "SHqaiWe4P.DeM3rzG6.mjs"], ["products", "shared-lib.Dw2ydB0E.mjs"]]) {
    const m = await import(base + f)
    const top = name === "looks" ? (m.t(), m.n) : (m.a(), m.t)
    const c = top.collectionByLocaleId.default
    const rows = (await c.scanItems()).map((it) => Object.fromEntries(Object.entries(it.data).map(([k, v]) => [k, v.type === "array" ? v.value.map((x) => x.value) : v.type === "enum" ? { enum: v.value, title: lib.i(v.value) } : v.value])))
    out[name] = { schema: c.schema, rows }
  }
  return out
})
import("node:fs").then(fs => fs.writeFileSync("data/.cms-raw.json", JSON.stringify(r, null, 1)))
console.log(JSON.stringify(r, null, 1)); await b.close()

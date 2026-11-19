// One-off: pull the data the Framer page passes to its custom code components
// (reels, flavour cards, intro, nav, bag…) out of the snapshot bundle into
// plain JSON under data/, with framerusercontent URLs resolved to local files.
// Usage: node scripts/extract-framer-data.mjs <prettified-module.js> <componentVar>=<name> ...
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { localAsset } from "./lib/framer-assets.mjs"

const ROOT = fileURLToPath(new URL("../", import.meta.url))

function matchObject(src, start) {
  let d = 0
  let inStr = null
  for (let i = start; i < src.length; i++) {
    const c = src[i]
    if (inStr) {
      if (c === "\\") i++
      else if (c === inStr) inStr = null
      continue
    }
    if (c === "`" || c === '"' || c === "'") inStr = c
    else if (c === "{") d++
    else if (c === "}" && --d === 0) return src.slice(start, i + 1)
  }
  throw new Error("unbalanced")
}

const resolveDeep = (v) =>
  Array.isArray(v)
    ? v.map(resolveDeep)
    : v && typeof v === "object"
      ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolveDeep(x)]))
      : localAsset(v)

const [file, ...pairs] = process.argv.slice(2)
const src = readFileSync(file, "utf8")
mkdirSync(ROOT + "data", { recursive: true })
for (const pair of pairs) {
  const [v, name] = pair.split("=")
  // Page instances only: `/*#__PURE__*/ d(Comp, {`, not property-control registrations.
  const re = new RegExp(`__PURE__\\*/ [a-z]\\(${v.replace("$", "\\$")}, \\{`, "g")
  const found = []
  let m
  while ((m = re.exec(src))) {
    const obj = matchObject(src, m.index + m[0].length - 1)
    // Link placeholders (e[0]…) and Framer helpers become harmless stubs.
    // Any free identifier (link arrays, Framer helpers) resolves to a stub.
    const scope = new Proxy(
      {},
      {
        has: (_, k) => !["Math", "JSON", "Number", "String", "undefined"].includes(k),
        get: (_, k) => (k === Symbol.unscopables ? undefined : new Proxy((...a) => (a[0] && typeof a[0] === "object" && a[0].src) || "#", { get: (_, p) => (p === Symbol.toPrimitive ? () => "#" : "#") })),
      },
    )
    const fn = new Function("__scope", `with (__scope) { return (${obj}) }`)
    try {
      found.push(resolveDeep(JSON.parse(JSON.stringify(fn(scope), (k, x) => (typeof x === "function" ? "#" : x)))))
    } catch (err) {
      found.push({ __error: String(err), __src: obj.slice(0, 400) })
    }
  }
  writeFileSync(ROOT + `data/${name}.json`, JSON.stringify(found.length === 1 ? found[0] : found, null, 2))
  console.log(`${name}: ${found.length} instance(s)`)
}

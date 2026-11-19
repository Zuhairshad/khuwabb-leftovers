// Dev aid: print the snapshot's CSS rules that mention given framer classes,
// labelled by breakpoint, and optionally an inline SVG symbol by id.
//   node scripts/css-rules.mjs [--page shop] class1 class2 ...   (without "framer-")
//   node scripts/css-rules.mjs --svg 2930526878
import { readFileSync } from "node:fs"

const args = process.argv.slice(2)
const pi = args.indexOf("--page")
const page = pi >= 0 ? args.splice(pi, 2)[1] : ""
const html = readFileSync(new URL(`../framer-snapshot/public/${page ? page + "/" : ""}index.html`, import.meta.url), "utf8")

if (args[0] === "--svg") {
  const id = args[1]
  const at = html.indexOf(`id="${id}"`)
  const start = html.lastIndexOf("<", at)
  const tag = html.slice(start + 1, html.indexOf(" ", start))
  console.log(html.slice(start, html.indexOf(`</${tag}>`, at) + tag.length + 3))
  process.exit(0)
}

const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n")
// Walk rules, tracking @media nesting.
const out = new Set()
let media = "base"
let i = 0
while (i < css.length) {
  if (css.startsWith("@media", i)) {
    const open = css.indexOf("{", i)
    media = css.slice(i + 7, open).trim()
    i = open + 1
    continue
  }
  if (css[i] === "}") {
    media = "base"
    i++
    continue
  }
  const open = css.indexOf("{", i)
  const close = css.indexOf("}", open)
  if (open < 0) break
  const sel = css.slice(i, open)
  const body = css.slice(open + 1, close)
  if (args.some((c) => new RegExp(`\\.framer-${c}(?![\\w-])`).test(sel))) out.add(`[${media}] ${sel.trim()} { ${body} }`)
  i = close + 1
}
console.log([...out].join("\n"))

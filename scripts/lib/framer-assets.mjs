// framerusercontent URL (with query) -> local path under public/framer/, using
// the URL map the export's service worker carries.
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const SNAP = fileURLToPath(new URL("../../framer-snapshot/public/", import.meta.url))
const sw = readFileSync(SNAP + "f2c-sw.js", "utf8")
const src = sw.slice(sw.indexOf("const M=") + 8)
let depth = 0
let end = 0
for (let i = 0; i < src.length; i++) {
  if (src[i] === "{") depth++
  else if (src[i] === "}" && --depth === 0) {
    end = i + 1
    break
  }
}
const urlMap = JSON.parse(src.slice(0, end))

export function localAsset(url) {
  if (typeof url !== "string" || !url.includes("framerusercontent.com")) return url
  const u = new URL(url)
  const hit = urlMap[u.pathname + u.search] ?? urlMap[u.pathname]
  if (!hit) throw new Error(`unmapped asset ${url}`)
  return "/framer/" + hit.replace(/^assets\/framerusercontent\.com\//, "")
}

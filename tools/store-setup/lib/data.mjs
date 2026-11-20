// Local source data → the desired store state. Pure/offline: no network here.
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { SHOPIFY_HANDLES, SHOPIFY_API_VERSION } from "../../../lib/shopify-config.mjs"

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
export { SHOPIFY_API_VERSION }
const readJson = (rel) => JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"))
const VIEWS = ["front", "side", "back"]
export const EMAIL = "khuwabb@gmail.com"

export const handleFor = (slug) => SHOPIFY_HANDLES[slug] ?? slug

export function rgbToHex(s) {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s ?? "")
  if (!m) return /^#[0-9a-f]{6}$/i.test(s ?? "") ? s.toLowerCase() : null
  return "#" + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, "0")).join("")
}

// Parse colour [name, folder] pairs out of scripts/build-khuwabb-data.mjs
// (that file writes data/products.json on import, so it is parsed, not imported).
export function parseBuildScriptColours() {
  const src = readFileSync(resolve(ROOT, "scripts/build-khuwabb-data.mjs"), "utf8")
  const out = {}
  const re = /slug:\s*"([^"]+)"[\s\S]*?colours:\s*\[((?:\s*\[[^\]]*\],?)+)\s*\]/g
  let m
  while ((m = re.exec(src))) {
    out[m[1]] = [...m[2].matchAll(/\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]/g)].map((x) => ({ name: x[1], folder: x[2] }))
  }
  return out
}

export function loadLocal() {
  const products = readJson("data/products.json")
  const shopify = readJson("data/shopify.json").products
  const buildColours = parseBuildScriptColours()
  const warnings = []
  const media = [] // {slug, handle, colour, folder, view, file, alt, filename}
  const items = products.map((p) => {
    const handle = handleFor(p.slug)
    const sp = shopify[handle]
    const fromScript = buildColours[p.slug]
    if (!fromScript) warnings.push(`${p.slug}: not found in build-khuwabb-data.mjs`)
    const cols = fromScript ?? p.colours.map((c) => ({ name: c.name, folder: (c.image ?? "").split("/")[3] }))
    if (fromScript) {
      const a = fromScript.map((c) => c.name).join("|"), b = p.colours.map((c) => c.name).join("|")
      if (a !== b) warnings.push(`${p.slug}: build script colours [${a}] differ from products.json [${b}]`)
    }
    if (!sp) warnings.push(`${p.slug}: no entry for handle "${handle}" in data/shopify.json`)
    else {
      for (const c of cols) if (!sp.colours.includes(c.name)) warnings.push(`${p.slug}: colour "${c.name}" (folder ${c.folder}) is not a Shopify colour of ${handle} [${sp.colours.join(", ")}]`)
      for (const c of sp.colours) if (!cols.some((x) => x.name === c)) warnings.push(`${p.slug}: Shopify colour "${c}" has no photo folder in build script`)
    }
    for (const c of cols) {
      const dir = `public/products/${p.slug}/${c.folder}`
      if (!existsSync(resolve(ROOT, dir))) { warnings.push(`${p.slug}: folder ${dir} missing`); continue }
      const views = [...VIEWS]
      if (p.slug === "gym-co-ords-set" && c.name === "Black") views.push("piece-top", "piece-bottom")
      for (const v of views) {
        const file = `${dir}/${v}.webp`
        if (!existsSync(resolve(ROOT, file))) { if (!(p.slug === "gym-co-ords-set" && v === "side")) warnings.push(`${file} missing${VIEWS.includes(v) ? " (view skipped)" : ""}`); continue }
        media.push({ slug: p.slug, handle, colour: c.name, folder: c.folder, view: v, file, alt: `${c.name} | ${v}`, filename: `${p.slug}-${c.folder}-${v}.webp` })
      }
    }
    let categoryLine = null
    if (p.category === "Gymwear") categoryLine = "Gymwear · top and leggings, sold as a set"
    else if (p.soldAs === "set") categoryLine = "Co-ord set · top and bottom"
    const d = p.details ?? {}
    return {
      slug: p.slug, handle, title: p.name, productType: p.category, newIn: !!p.newIn, colours: cols,
      tint: rgbToHex(p.tint), categoryLine, fabric: d.fabric ?? null, care: d.care ?? null, sizeChart: d.sizeChart ?? null,
      description: d.description ?? null,
    }
  })
  return { items, media, shopifyHandles: Object.keys(shopify), warnings }
}

export const DEFINITIONS = [
  { key: "tint", name: "Tint", type: "color", description: "Pastel background colour behind this product's cut-outs on the storefront." },
  { key: "category_line", name: "Category line", type: "single_line_text_field", description: "Line shown above the product title, e.g. \"Co-ord set · top and bottom\". Leave blank to show the product type." },
  { key: "fabric", name: "Fabric", type: "single_line_text_field", description: "Fabric composition shown on the product page." },
  { key: "care", name: "Care", type: "multi_line_text_field", description: "Care instructions shown on the product page." },
  { key: "size_guide", name: "Size guide", type: "rich_text_field", description: "Size chart / measurements shown in the size guide." },
]

export const COLLECTIONS = [
  { handle: "jackets", title: "Jackets", type: "Jackets" },
  { handle: "trousers", title: "Trousers", type: "Trousers" },
  { handle: "dresses", title: "Dresses", type: "Dresses" },
  { handle: "gym-wear", title: "Gym wear", type: "Gymwear" },
  { handle: "co-ord-sets", title: "Co-ord sets", type: "Co-ord Set" },
  { handle: "new-in", title: "New arrivals", manual: true },
]

const M = `mailto:${EMAIL}`
export const MENUS = [
  { handle: "main-menu", title: "Main menu", items: [["Shop", "/collections/all"], ["New in", "/collections/new-in"], ["Lookbook", "/#looks"]] },
  { handle: "footer-shop", title: "Shop", items: [["All collections", "/collections/all"], ["New in", "/collections/new-in"], ["Lookbook", "/#looks"]] },
  { handle: "footer-help", title: "Help", items: [["Size guide", `${M}?subject=Size%20guide`], ["7-day exchange", `${M}?subject=Exchange`], [EMAIL, M]] },
  { handle: "footer-khuwabb", title: "Khuwabb", items: [["Born in Lahore", "/"], ["Delivery across Pakistan", "/collections/all"], ["Cash on delivery", "/collections/all"]] },
]

export const REDIRECTS = [
  ["/shop", "/collections/all"],
  ["/new-in", "/collections/new-in"],
  ["/products/boat-neck-long-sleeve-maxi-dress", "/products/womens-boat-neck-long-sleeve-maxi-dress"],
  ["/products/ladies-vinyl-jacket", "/products/womens-high-shine-vinyl-puffer-jacket"],
]

export const FILES = [
  ["public/brand/collections.jpg", "collections.jpg"],
  ["public/brand/wear-the-dream.jpg", "wear-the-dream.jpg"],
  ...["daily-edit", "off-duty", "street-ready", "brunch-dates"].map((n) => [`public/brand/looks/${n}.jpg`, `looks-${n}.jpg`]),
]

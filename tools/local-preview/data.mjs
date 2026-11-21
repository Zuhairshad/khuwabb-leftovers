// Mock Shopify objects built from the repo's local catalog (no network).
// images.mjs (dimensions, ?width= variants) is documented in tools/compare/README.md "Preview mock notes".
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { imageSize } from "./images.mjs"
import { Drop } from "liquidjs"
import { ROOT, loadLocal, COLLECTIONS, MENUS } from "../store-setup/lib/data.mjs"

const readJson = (rel) => JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"))
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
export const handleize = (s) => String(s ?? "").toLowerCase().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

let cache
export async function loadCatalog() {
  if (cache) return cache
  const { items, media } = loadLocal()
  const shopify = readJson("data/shopify.json").products
  const products = readJson("data/products.json")
  const sizes = {}
  await Promise.all(media.map(async (m) => {
    // Real dimensions from the file header (cached), as Shopify returns for media.
    sizes[m.file] = imageSize(resolve(ROOT, m.file)) ?? { width: 0, height: 0 }
  }))
  cache = { items, media, shopify, products, sizes }
  return cache
}

// A fresh, request-scoped object graph (selected variant depends on the URL).
export function buildStore(cat, { selectedVariantId } = {}) {
  let mediaId = 1000
  const byHandle = {}
  const list = []
  cat.items.forEach((it, i) => {
    const sp = cat.shopify[it.handle]
    const src = cat.products.find((p) => p.slug === it.slug)
    if (!sp) return
    const media = cat.media.filter((m) => m.slug === it.slug).map((m) => {
      const { width, height } = cat.sizes[m.file]
      const url = "/" + m.file.replace(/^public\//, "")
      const img = { src: url, url, width, height, alt: m.alt, aspect_ratio: width / height, id: ++mediaId }
      return { id: img.id, media_type: "image", alt: m.alt, src: url, url, width, height, aspect_ratio: img.aspect_ratio, position: 0, preview_image: img }
    })
    media.forEach((m, j) => (m.position = j + 1))
    const frontOf = (colour) => media.find((m) => m.alt === `${colour} | front`) ?? null
    const pid = 9000000 + i
    const variants = sp.variants.map((v, j) => ({
      id: Number(v.id), title: `${v.colour} / ${v.size}`, name: `${sp.title} - ${v.colour} / ${v.size}`,
      options: [v.colour, v.size], option1: v.colour, option2: v.size, option3: null,
      available: !!v.available, price: Math.round(v.price * 100),
      compare_at_price: v.compareAt ? Math.round(v.compareAt * 100) : null,
      featured_media: frontOf(v.colour), featured_image: frontOf(v.colour)?.preview_image ?? null,
      image: frontOf(v.colour)?.preview_image ?? null,
      sku: `${it.handle}-${handleize(v.colour)}-${v.size}`.toUpperCase(), url: `/products/${it.handle}?variant=${v.id}`,
      product_id: pid, position: j + 1, inventory_management: "shopify", requires_shipping: true, weight: 0, barcode: "",
    }))
    const selected = variants.find((v) => String(v.id) === String(selectedVariantId)) ?? null
    const firstAvail = variants.find((v) => v.available) ?? variants[0]
    const current = selected ?? firstAvail
    const optionDefs = [["Color", sp.colours], ["Size", sp.sizes]]
    const options_with_values = optionDefs.map(([name, values], k) => ({
      name, position: k + 1, values, selected_value: current ? current.options[k] : null,
    }))
    const prices = variants.map((v) => v.price)
    const meta = (value, type) => (value == null ? null : { value, type })
    const p = {
      id: pid, title: sp.title, handle: it.handle, url: `/products/${it.handle}`, type: it.productType,
      vendor: "Khuwabb", tags: it.newIn ? ["new-in"] : [],
      description: it.description ? `<p>${esc(it.description)}</p>` : "", content: "",
      price: Math.min(...prices), price_min: Math.min(...prices), price_max: Math.max(...prices), price_varies: new Set(prices).size > 1,
      compare_at_price: null, compare_at_price_max: 0, compare_at_price_min: 0,
      available: variants.some((v) => v.available),
      options: optionDefs.map(([n]) => n), options_with_values,
      options_by_name: Object.fromEntries(options_with_values.map((o) => [o.name, o])),
      has_only_default_variant: false, variants, selected_variant: selected,
      selected_or_first_available_variant: current, first_available_variant: firstAvail,
      media, featured_media: media[0] ?? null, images: media.map((m) => m.preview_image), featured_image: media[0]?.preview_image ?? null,
      metafields: { custom: {
        tint: it.tint ? { value: colorObj(it.tint), type: "color" } : null,
        category_line: meta(it.categoryLine, "single_line_text_field"),
        fabric: meta(it.fabric, "single_line_text_field"),
        care: meta(it.care, "multi_line_text_field"),
        size_guide: meta(it.sizeChart ? sizeChartHtml(it.sizeChart) : null, "rich_text_field"),
      } },
      template_suffix: null, object_type: "product", newIn: it.newIn, _src: src,
    }
    byHandle[p.handle] = p
    list.push(p)
  })

  const collections = []
  const mk = (handle, title, products) => {
    const c = {
      id: 7000 + collections.length, handle, title, url: `/collections/${handle}`, products,
      products_count: products.length, all_products_count: products.length,
      description: "", image: null, featured_image: null, template_suffix: existsSync(resolve(ROOT, `theme/templates/collection.${handle}.json`)) ? handle : null,
      all_types: [...new Set(products.map((p) => p.type))], sort_by: "manual", default_sort_by: "manual", filters: [],
    }
    collections.push(c)
    collections[handle] = c
    return c
  }
  for (const c of COLLECTIONS) {
    const prods = c.manual ? list.filter((p) => p.newIn) : list.filter((p) => p.type === c.type)
    mk(c.handle, c.title, prods)
  }
  const all = mk("all", "Products", list)
  collections.splice(collections.indexOf(all), 1) // "all" is addressable but not listed

  const all_products = Object.assign([...list], byHandle)
  const linklists = []
  for (const m of MENUS) {
    const l = { handle: m.handle, title: m.title, levels: 1, links: m.items.map(([title, url]) => ({ title, url, active: false, current: false, child_active: false, links: [], levels: 0, type: "http_link" })) }
    linklists.push(l)
    linklists[m.handle] = l
  }
  return { products: list, byHandle, all_products, collections, linklists }
}

function sizeChartHtml(sc) {
  if (typeof sc === "string") return `<p>${esc(sc)}</p>`
  return `<pre>${esc(JSON.stringify(sc, null, 2))}</pre>`
}

export class ColorDrop extends Drop {
  constructor(hex) {
    super()
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex) ?? [0, "00", "00", "00"]
    this.hex = `#${m[1]}${m[2]}${m[3]}`.toLowerCase()
    this.red = parseInt(m[1], 16); this.green = parseInt(m[2], 16); this.blue = parseInt(m[3], 16); this.alpha = 1
    this.rgb = `${this.red} ${this.green} ${this.blue}`
    this.rgba = `${this.red} ${this.green} ${this.blue} / 1.0`
  }
  valueOf() { return this.hex }
  toString() { return this.hex }
  toJSON() { return this.hex }
}
export const colorObj = (hex) => (hex ? new ColorDrop(hex) : null)

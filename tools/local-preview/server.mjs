// Offline preview of theme/ — renders the Liquid theme with LiquidJS against mock
// store data from data/*.json. No Shopify login, nothing is uploaded.
// Not a full Shopify: checkout, customer accounts and real inventory are mocked.
import http from "node:http"
import { readFileSync, existsSync, statSync, createReadStream } from "node:fs"
import { resolve, extname, join } from "node:path"
import { Liquid, Tag, Value } from "liquidjs"
import { ROOT } from "../store-setup/lib/data.mjs"
import { imageObject, pickVariant } from "./images.mjs"
import { loadCatalog, buildStore, handleize, colorObj } from "./data.mjs"

const PORT = Number(process.env.PORT || 9292)
const THEME = resolve(ROOT, "theme")
const read = (p) => readFileSync(p, "utf8")
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
const readJsonc = (p) => JSON.parse(read(p).replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ""))

// ---------------------------------------------------------------- Liquid engine
// Shopify allows `comment ... endcomment` with free text inside {% liquid %}; LiquidJS doesn't, so strip those lines.
const pre = (src) => src.replace(/^[ \t]*comment[ \t]*\r?\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, "")
const themeFs = {
  readFileSync: (p) => pre(read(p)), readFile: async (p) => pre(read(p)), existsSync, exists: async (p) => existsSync(p),
  resolve: (root, file, ext) => resolve(root, extname(file) ? file : file + ext), contains: () => true, sep: "/", dirname: (p) => resolve(p, ".."),
}
const engine = new Liquid({ root: [join(THEME, "snippets")], extname: ".liquid", cache: false, strictFilters: false, strictVariables: false, fs: themeFs })

// keyword args arrive as [key, value] pairs
const kw = (args) => {
  const o = {}, pos = []
  for (const a of args) Array.isArray(a) && a.length === 2 && typeof a[0] === "string" ? (o[a[0]] = a[1]) : pos.push(a)
  return [o, pos]
}

function rawBlock(name) {
  return class extends Tag {
    constructor(token, remain, liquid) {
      super(token, remain, liquid)
      this.body = ""
      while (remain.length) {
        const t = remain.shift()
        if (t.name === `end${name}`) return
        this.body += t.getText()
      }
      throw new Error(`tag ${name} not closed`)
    }
    * render() {}
  }
}
engine.registerTag("schema", rawBlock("schema"))
engine.registerTag("javascript", rawBlock("javascript"))
engine.registerTag("stylesheet", rawBlock("stylesheet"))
engine.registerTag("layout", class extends Tag { * render() {} })

engine.registerTag("style", class extends Tag {
  constructor(token, remain, liquid, parser) {
    super(token, remain, liquid)
    this.tpls = []
    const stream = parser.parseStream(remain)
    stream.on("tag:endstyle", () => stream.stop()).on("template", (t) => this.tpls.push(t)).on("end", () => { throw new Error("tag style not closed") })
    stream.start()
  }
  * render(ctx, emitter) {
    emitter.write("<style data-shopify>")
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter)
    emitter.write("</style>")
  }
})

const FORM_ACTIONS = {
  product: "/cart/add", customer_login: "/account/login", create_customer: "/account", recover_customer_password: "/account/recover",
  reset_customer_password: "/account/reset", activate_customer_password: "/account/activate", customer_address: "/account/addresses",
  customer: "/contact", contact: "/contact", storefront_password: "/password", new_comment: "/blogs/comments", localization: "/localization", cart: "/cart",
  // Real Shopify posts guest checkout to the login endpoint with checkout_url/guest fields.
  guest_login: "/account/login",
}
engine.registerTag("form", class extends Tag {
  constructor(token, remain, liquid, parser) {
    super(token, remain, liquid)
    // first arg = type string, then optional positional object, then key: value attrs
    this.args = token.args
    this.tpls = []
    const stream = parser.parseStream(remain)
    stream.on("tag:endform", () => stream.stop()).on("template", (t) => this.tpls.push(t)).on("end", () => { throw new Error("tag form not closed") })
    stream.start()
  }
  * render(ctx, emitter) {
    const parts = splitArgs(this.args)
    const type = yield evalExpr(parts.shift(), ctx, this.liquid)
    const attrs = {}
    for (const p of parts) {
      const m = /^([\w-]+)\s*:\s*([\s\S]+)$/.exec(p)
      if (m) attrs[m[1]] = yield evalExpr(m[2], ctx, this.liquid)
    }
    const q = ctx.globals.request?.query ?? {}
    let action = FORM_ACTIONS[type] ?? "/"
    if (type === "customer_address" && attrs.id == null) action = "/account/addresses"
    const posted = type === "customer" && q.customer_posted === "true"
    const a = Object.entries(attrs).filter(([k]) => !["return_to"].includes(k)).map(([k, v]) => ` ${k}="${esc(v)}"`).join("")
    emitter.write(`<form method="post" action="${action}"${a} accept-charset="UTF-8"${type === "product" ? ' enctype="multipart/form-data"' : ""}><input type="hidden" name="form_type" value="${esc(type)}"><input type="hidden" name="utf8" value="✓">`)
    ctx.push({ form: { errors: null, posted_successfully: posted, id: attrs.id ?? null, email: "", first_name: "", last_name: "", set_as_default_checkbox: "<input type=\"checkbox\" name=\"address[default]\" value=\"1\">" } })
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter)
    ctx.pop()
    emitter.write("</form>")
  }
})

engine.registerTag("paginate", class extends Tag {
  constructor(token, remain, liquid, parser) {
    super(token, remain, liquid)
    const m = /^\s*([\w.\[\]'"-]+)\s+by\s+([\w.]+)/.exec(token.args)
    this.path = m[1]; this.by = m[2]
    this.tpls = []
    const stream = parser.parseStream(remain)
    stream.on("tag:endpaginate", () => stream.stop()).on("template", (t) => this.tpls.push(t)).on("end", () => { throw new Error("tag paginate not closed") })
    stream.start()
  }
  * render(ctx, emitter) {
    const size = Number(yield evalExpr(this.by, ctx, this.liquid)) || 50
    const segs = this.path.split(".")
    const owner = segs.length > 1 ? yield evalExpr(segs.slice(0, -1).join("."), ctx, this.liquid) : null
    const key = segs[segs.length - 1]
    const full = (owner ? owner[key] : yield evalExpr(this.path, ctx, this.liquid)) ?? []
    const q = ctx.globals.request?.query ?? {}
    const path = ctx.globals.request?.path ?? "/"
    const pages = Math.max(1, Math.ceil(full.length / size))
    const cur = Math.min(Math.max(1, Number(q.page) || 1), pages)
    const url = (n) => `${path}?page=${n}`
    const paginate = {
      current_page: cur, current_offset: (cur - 1) * size, items: full.length, page_size: size, pages,
      previous: cur > 1 ? { title: "Previous", url: url(cur - 1), is_link: true } : null,
      next: cur < pages ? { title: "Next", url: url(cur + 1), is_link: true } : null,
      parts: Array.from({ length: pages }, (_, i) => ({ title: i + 1, url: url(i + 1), is_link: i + 1 !== cur })),
    }
    const slice = full.slice((cur - 1) * size, cur * size)
    if (owner) owner[key] = slice
    ctx.push({ paginate })
    try { yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter) } finally { ctx.pop(); if (owner) owner[key] = full }
  }
})

engine.registerTag("section", class extends Tag {
  * render(ctx, emitter) {
    const name = yield evalExpr(this.token.args, ctx, this.liquid)
    emitter.write(yield renderSection(name, { id: name, type: name, settings: {} }, ctx.globals, { static: true }))
  }
})
engine.registerTag("sections", class extends Tag {
  * render(ctx, emitter) {
    const name = yield evalExpr(this.token.args, ctx, this.liquid)
    const file = join(THEME, "sections", `${name}.json`)
    if (!existsSync(file)) return
    const group = readJsonc(file)
    for (const key of group.order ?? Object.keys(group.sections)) {
      const s = group.sections[key]
      if (s.disabled) continue
      emitter.write(yield renderSection(s.type, { ...s, id: `sections--local__${key}` }, ctx.globals, { groupClass: `shopify-section-group-${name}` }))
    }
  }
})

function splitArgs(s) {
  const out = []; let cur = "", q = null, depth = 0
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue }
    if (ch === "'" || ch === '"') { q = ch; cur += ch; continue }
    if (ch === "[" || ch === "(") depth++
    if (ch === "]" || ch === ")") depth--
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue }
    cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}
function* evalExpr(src, ctx, liquid) { return yield new Value(src, liquid).value(ctx, false) }

// ---------------------------------------------------------------- filters
const locales = readJsonc(join(THEME, "locales/en.default.json"))
const lookup = (key) => key.split(".").reduce((o, k) => (o == null ? o : o[k]), locales)
engine.registerFilter("t", (key, ...args) => {
  const [o] = kw(args)
  let v = lookup(String(key))
  if (v && typeof v === "object" && "count" in o) v = Number(o.count) === 1 && v.one != null ? v.one : (v.other ?? v.one)
  if (v == null || typeof v === "object") return `translation missing: en.${key}`
  return String(v).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, n) => (o[n] ?? ""))
})
engine.registerFilter("asset_url", (n) => `/theme-assets/${n}`)
engine.registerFilter("shopify_asset_url", (n) => `/theme-assets/shopify/${n}`)
engine.registerFilter("file_url", (n) => `/theme-assets/${n}`)
engine.registerFilter("stylesheet_tag", (u, ...a) => { const [o] = kw(a); return `<link href="${u}" rel="stylesheet" type="text/css" media="${o.media ?? "all"}" />` })
engine.registerFilter("script_tag", (u) => `<script src="${u}" type="text/javascript"></script>`)
engine.registerFilter("preload_tag", (u, ...a) => { const [o] = kw(a); return `<link href="${u}" rel="preload" as="${o.as ?? "style"}">` })
const imgSrc = (x) => (x == null ? "" : typeof x === "string" ? x : x.preview_image?.src ?? x.src ?? x.url ?? "")
engine.registerFilter("image_url", (x, ...a) => {
  const [o] = kw(a); const s = imgSrc(x)
  if (!s) return ""
  return o.width ? `${s}${s.includes("?") ? "&" : "?"}width=${o.width}` : s
})
engine.registerFilter("img_url", (x) => imgSrc(x))
engine.registerFilter("image_tag", (url, ...a) => {
  const [o] = kw(a)
  if (!url) return ""
  const base = String(url).replace(/[?&]width=\d+/, "")
  const attrs = { src: url }
  if (o.widths) attrs.srcset = String(o.widths).split(",").map((w) => w.trim()).filter(Boolean).map((w) => `${base}?width=${w} ${w}w`).join(", ")
  for (const k of ["sizes", "width", "height", "class", "loading", "fetchpriority", "id", "style"]) if (o[k] != null && o[k] !== "") attrs[k] = o[k]
  attrs.alt = o.alt ?? ""
  for (const [k, v] of Object.entries(o)) if (k.startsWith("data-") || k.startsWith("aria-")) attrs[k] = v
  return `<img ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(" ")}>`
})
engine.registerFilter("json", (v) => JSON.stringify(v ?? null, (k, x) => (k === "_src" ? undefined : x)))
const money = (c) => `Rs.${Math.round(Number(c || 0) / 100).toLocaleString("en-US")}`
engine.registerFilter("money", money)
engine.registerFilter("money_with_currency", (c) => `${money(c)} PKR`)
engine.registerFilter("money_without_currency", (c) => Math.round(Number(c || 0) / 100).toLocaleString("en-US"))
engine.registerFilter("money_without_trailing_zeros", money)
engine.registerFilter("handle", handleize)
engine.registerFilter("handleize", handleize)
engine.registerFilter("default_errors", (e) => (e ? `<ul>${[].concat(e.messages ?? e).map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""))
engine.registerFilter("time_tag", function (d, ...a) {
  if (!d) return ""
  const dt = new Date(d)
  return `<time datetime="${dt.toISOString()}">${dt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</time>`
})
engine.registerFilter("format_address", (ad) => (ad ? [ad.name, ad.address1, ad.address2, ad.city, ad.country].filter(Boolean).map(esc).join("<br>") : ""))
engine.registerFilter("color_extract", (c, comp) => { const o = typeof c === "object" && c ? c : colorObj(String(c)); return o ? o[comp] : "" })
engine.registerFilter("color_to_rgb", (c) => { const o = colorObj(String(c)); return o ? `rgb(${o.red}, ${o.green}, ${o.blue})` : "" })
engine.registerFilter("metafield_tag", (m) => (m == null ? "" : typeof m === "object" ? (m.value ?? "") : m))
engine.registerFilter("metafield_text", (m) => (m == null ? "" : String(m.value ?? m).replace(/<[^>]+>/g, "")))
engine.registerFilter("placeholder_svg_tag", () => `<svg class="placeholder-svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#eee"/></svg>`)
engine.registerFilter("link_to", (t, u) => `<a href="${esc(u)}">${t}</a>`)
engine.registerFilter("within", (u) => u)
engine.registerFilter("highlight", (t) => t)
engine.registerFilter("payment_type_svg_tag", () => "")
// Shopify: integer ÷ integer floors (LiquidJS returns a float)
engine.registerFilter("divided_by", (a, b) => { a = Number(a); b = Number(b); return Number.isInteger(a) && Number.isInteger(b) ? Math.floor(a / b) : a / b })
engine.registerFilter("pluralize", (n, one, many) => (Number(n) === 1 ? one : many))

// ---------------------------------------------------------------- sections
const parsedSections = new Map()
function loadSection(type) {
  const file = join(THEME, "sections", `${type}.liquid`)
  if (!existsSync(file)) return null
  const mtime = statSync(file).mtimeMs
  const hit = parsedSections.get(type)
  if (hit && hit.mtime === mtime) return hit
  const src = read(file)
  const m = /\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/.exec(src)
  let schema = {}
  try { schema = m ? JSON.parse(m[1]) : {} } catch (e) { console.warn(`schema parse failed in ${type}: ${e.message}`) }
  const entry = { mtime, schema, tpl: engine.parse(pre(src), file) }
  parsedSections.set(type, entry)
  return entry
}

function resolveSetting(def, v, g) {
  if (v === undefined) v = def.default
  switch (def.type) {
    case "product": return (v && g.all_products[v]) || null
    case "collection": return (v && g.collections[v]) || null
    case "product_list": return (v ?? []).map((h) => g.all_products[h]).filter(Boolean)
    case "collection_list": return (v ?? []).map((h) => g.collections[h]).filter(Boolean)
    case "link_list": return (v && g.linklists[v]) || null
    case "color": return v ? colorObj(v) : null
    case "url": return typeof v === "string" ? v.replace(/^shopify:\/\/(products|collections|pages|blogs)\//, "/$1/").replace(/^shopify:\/\/collections$/, "/collections") : v ?? null
    // image_picker: a string naming a file under public/ becomes an image object with real width/height.
    case "image_picker": return (typeof v === "string" && v.startsWith("/") && imageObject(v)) || v || null
    case "video": case "video_url": return v || null
    case "checkbox": return v ?? false
    default: return v ?? null
  }
}
function resolveSettings(defs = [], values = {}, g) {
  const out = {}
  for (const d of defs) if (d.id) out[d.id] = resolveSetting(d, values[d.id], g)
  for (const [k, v] of Object.entries(values)) if (!(k in out)) out[k] = v
  return out
}

async function renderSection(type, data, globals, { static: isStatic, groupClass, bare } = {}) {
  const sec = loadSection(type)
  if (!sec) return `<!-- section ${esc(type)} not found -->`
  const { schema } = sec
  const blockDefs = Object.fromEntries((schema.blocks ?? []).map((b) => [b.type, b.settings ?? []]))
  let order = data.block_order ?? Object.keys(data.blocks ?? {})
  let blocksSrc = data.blocks ?? {}
  if (!data.blocks && isStatic && schema.presets?.[0]?.blocks) {
    blocksSrc = Object.fromEntries(schema.presets[0].blocks.map((b, i) => [`preset_${i}`, b])); order = Object.keys(blocksSrc)
  }
  const blocks = order.filter((k) => blocksSrc[k] && !blocksSrc[k].disabled).map((k) => {
    const b = blocksSrc[k]
    return { id: k, type: b.type, settings: resolveSettings(blockDefs[b.type], b.settings ?? {}, globals), shopify_attributes: `data-block-id="${k}"` }
  })
  const section = { id: data.id, type, settings: resolveSettings(schema.settings, data.settings ?? {}, globals), blocks, location: groupClass ?? "template", index: data.index ?? 1, index0: (data.index ?? 1) - 1 }
  let html
  try {
    html = await engine.render(sec.tpl, { section }, { globals })
  } catch (e) {
    console.error(`[section ${type}] ${e.message}`)
    html = `<pre style="color:#b00;white-space:pre-wrap;padding:16px;border:1px solid #b00">Liquid error in sections/${esc(type)}.liquid:\n${esc(e.message)}</pre>`
  }
  if (bare) return html
  const tag = schema.tag ?? "div"
  const cls = ["shopify-section", groupClass, schema.class].filter(Boolean).join(" ")
  return `<${tag} id="shopify-section-${data.id}" class="${cls}">${html}</${tag}>`
}

// ---------------------------------------------------------------- cart (in memory, per visitor)
// Each browser context gets its own cart via a `cart=<id>` cookie, so parallel compare/QA runs
// (separate contexts, separate cookie jars) never see each other's bag count. A request sent with
// no cookie (e.g. curl) gets a fresh empty cart; a request that sends a known cart cookie reuses it.
const carts = new Map()
function parseCookies(req) {
  const out = {}
  for (const part of String(req.headers.cookie ?? "").split(";")) {
    const i = part.indexOf("=")
    if (i < 0) continue
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}
function getCart(req, res) {
  let id = parseCookies(req).cart
  if (!id) id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  if (!carts.has(id)) {
    carts.set(id, { items: [], note: "" })
    res.setHeader("Set-Cookie", `cart=${id}; Path=/; SameSite=Lax`)
  }
  return carts.get(id)
}
function cartObject(store, cart) {
  const items = cart.items.map((li) => {
    const p = store.products.find((x) => x.variants.some((v) => v.id === li.id))
    const v = p.variants.find((x) => x.id === li.id)
    const image = v.featured_image ?? p.featured_image
    return {
      id: v.id, key: li.key, variant_id: v.id, product_id: p.id, quantity: li.quantity, title: `${p.title} - ${v.title}`,
      product_title: p.title, variant_title: v.title, product: p, variant: v, price: v.price, final_price: v.price, original_price: v.price,
      line_price: v.price * li.quantity, final_line_price: v.price * li.quantity, original_line_price: v.price * li.quantity,
      image, featured_image: image ? { url: image.src, alt: image.alt, width: image.width, height: image.height } : null,
      url: v.url, handle: p.handle, sku: v.sku, vendor: p.vendor, product_type: p.type, requires_shipping: true,
      url_to_remove: `/cart/change?id=${li.key}&quantity=0`, object_type: "line_item",
      options_with_values: p.options.map((name, i) => ({ name, value: v.options[i] })),
      line_level_discount_allocations: [], discounts: [], properties: {}, gift_card: false,
    }
  })
  const total = items.reduce((s, i) => s + i.final_line_price, 0)
  return {
    token: "local-preview", note: cart.note, attributes: {}, items, item_count: items.reduce((s, i) => s + i.quantity, 0),
    total_price: total, original_total_price: total, items_subtotal_price: total, total_discount: 0, total_weight: 0,
    currency: { iso_code: "PKR" }, requires_shipping: items.length > 0, cart_level_discount_applications: [], discount_applications: [],
  }
}
const cartJson = (c) => JSON.parse(JSON.stringify({ ...c, items: c.items.map(({ product, variant, image, ...rest }) => ({ ...rest, image: rest.featured_image?.url ?? null })) }))

// ---------------------------------------------------------------- request context
const settingsSchema = readJsonc(join(THEME, "config/settings_schema.json"))
function themeSettings(g) {
  const data = readJsonc(join(THEME, "config/settings_data.json"))
  const cur = typeof data.current === "string" ? data.presets?.[data.current] ?? {} : data.current ?? {}
  const defs = settingsSchema.flatMap((g) => g.settings ?? [])
  return resolveSettings(defs, cur, g)
}

async function globalsFor(req, res, url, extra = {}) {
  const cat = await loadCatalog()
  const store = buildStore(cat, { selectedVariantId: url.searchParams.get("variant") })
  const g = { all_products: store.all_products, collections: store.collections, linklists: store.linklists }
  const origin = `http://${req.headers.host}`
  const cart = getCart(req, res)
  return {
    ...g, store,
    settings: themeSettings(g),
    shop: { name: "Khuwabb", url: origin, secure_url: origin, domain: req.headers.host, email: "khuwabb@gmail.com", currency: "PKR", money_format: "Rs.{{amount_no_decimals}}", password_message: "Opening soon", checkout: { guest_login: true }, enabled_payment_types: [], customer_accounts_enabled: true, customer_accounts_optional: true, types: [...new Set(store.products.map((p) => p.type))] },
    routes: { root_url: "/", account_url: "/account", account_login_url: "/account/login", account_logout_url: "/account/logout", account_register_url: "/account/register", account_addresses_url: "/account/addresses", collections_url: "/collections", all_products_collection_url: "/collections/all", search_url: "/search", predictive_search_url: "/search/suggest", cart_url: "/cart", cart_add_url: "/cart/add", cart_change_url: "/cart/change", cart_clear_url: "/cart/clear", cart_update_url: "/cart/update", product_recommendations_url: "/recommendations/products" },
    request: { locale: { iso_code: "en", primary: true }, design_mode: false, visual_preview_mode: false, origin, host: req.headers.host, path: url.pathname, page_type: extra.template?.name ?? "", query: Object.fromEntries(url.searchParams) },
    localization: { language: { iso_code: "en" }, country: { iso_code: "PK", currency: { iso_code: "PKR" } } },
    cart: cartObject(store, cart), customer: null, canonical_url: origin + url.pathname, page_title: "Khuwabb", page_description: "",
    content_for_header: `<script>window.Shopify = { shop: "local-preview", locale: "en", currency: { active: "PKR", rate: "1.0" }, routes: { root: "/" } };</script>`,
    content_for_additional_checkout_buttons: "", additional_checkout_buttons: false,
    ...extra,
  }
}

async function renderPage(req, res, url, route) {
  const g = await globalsFor(req, res, url, route.objects?.(null) ?? {})
  if (route.objects) Object.assign(g, route.objects(g.store))
  g.template = { name: route.template, suffix: route.suffix ?? null, directory: route.template.startsWith("customers") ? "customers" : null }
  g.template.name = route.template.replace(/^customers\//, "")
  g.request.page_type = g.template.name
  const base = join(THEME, "templates", route.template + (route.suffix ? `.${route.suffix}` : ""))
  if (existsSync(base + ".liquid")) {
    return engine.render(engine.parse(pre(read(base + ".liquid")), base + ".liquid"), {}, { globals: g })
  }
  const tplJson = readJsonc(base + ".json")
  let content = ""
  let i = 0
  for (const key of tplJson.order ?? Object.keys(tplJson.sections)) {
    const s = tplJson.sections[key]
    if (s.disabled) continue
    content += await renderSection(s.type, { ...s, id: `template--local__${key}`, index: ++i }, g)
  }
  if (route.sectionId) return content
  const layoutName = tplJson.layout === false ? null : tplJson.layout ?? "theme"
  if (!layoutName) return content
  const lf = join(THEME, "layout", `${layoutName}.liquid`)
  return engine.render(engine.parse(pre(read(lf)), lf), {}, { globals: { ...g, content_for_layout: content } })
}

// Mock `search`: matches product title / product_type / tags / variant option values,
// case-insensitive. Reuses the same product drop as everywhere else (products already carry
// object_type: "product" from buildStore), so main-search.liquid's `| where: 'object_type', ...`
// and product-card rendering work unchanged. An empty query means search.performed is false.
function searchObject(store, q) {
  const terms = String(q ?? "").trim()
  if (!terms) return { performed: false, terms: "", results: [], results_count: 0, types: [] }
  const needle = terms.toLowerCase()
  const results = store.products.filter((p) => {
    const haystack = [p.title, p.type, ...(p.tags ?? []), ...((p.options_with_values ?? []).flatMap((o) => o.values ?? []))]
    return haystack.some((v) => String(v ?? "").toLowerCase().includes(needle))
  })
  return { performed: true, terms, results, results_count: results.length, types: [...new Set(results.map((r) => r.object_type))] }
}

function route(pathname, store, url) {
  let m
  if (pathname === "/") return { template: "index" }
  if ((m = /^\/products\/([^/]+)\/?$/.exec(pathname))) {
    const h = decodeURIComponent(m[1])
    return { template: "product", objects: (s) => (s ? { product: s.byHandle[h] ?? null, page_title: s.byHandle[h]?.title } : {}), need: (s) => !!s.byHandle[h] }
  }
  if (pathname === "/collections" || pathname === "/collections/") return { template: "list-collections" }
  if ((m = /^\/collections\/([^/]+)\/?$/.exec(pathname))) {
    const h = decodeURIComponent(m[1])
    const suffix = existsSync(join(THEME, "templates", `collection.${h}.json`)) ? h : null
    return { template: "collection", suffix, objects: (s) => (s ? { collection: s.collections[h] ?? null, page_title: s.collections[h]?.title } : {}), need: (s) => !!s.collections[h] }
  }
  if (pathname === "/cart") return { template: "cart" }
  if (pathname === "/search") return { template: "search", objects: (s) => (s ? { search: searchObject(s, url?.searchParams.get("q")) } : {}) }
  if (pathname === "/password") return { template: "password" }
  if ((m = /^\/pages\/([^/]+)/.exec(pathname))) return { template: "page", objects: () => ({ page: { title: m[1].replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()), handle: m[1], content: "<p>This is a placeholder page in the local preview.</p>", url: pathname } }) }
  if (/^\/blogs\/[^/]+\/[^/]+/.test(pathname)) return { template: "article", objects: () => ({ blog: mockBlog(), article: mockBlog().articles[0] }) }
  if (/^\/blogs\/[^/]+\/?$/.test(pathname)) return { template: "blog", objects: () => ({ blog: mockBlog() }) }
  if (pathname === "/account/login") return { template: "customers/login" }
  if (pathname === "/account/register") return { template: "customers/register" }
  if (pathname === "/account/reset") return { template: "customers/reset_password" }
  if (pathname === "/account/activate") return { template: "customers/activate_account" }
  if (pathname === "/gift_cards/demo") return { template: "gift_card", objects: () => ({ gift_card: mockGiftCard() }) }
  return null
}
const mockBlog = () => {
  const article = { title: "Made in Lahore", handle: "made-in-lahore", url: "/blogs/news/made-in-lahore", author: "Khuwabb", published_at: "2026-11-01", created_at: "2026-11-01", content: "<p>A sample article for the local preview.</p>", excerpt: "A sample article for the local preview.", excerpt_or_content: "<p>A sample article.</p>", image: null, comments: [], comments_count: 0, comments_enabled: false, tags: [] }
  return { title: "News", handle: "news", url: "/blogs/news", articles: [article], articles_count: 1, comments_enabled: false, tags: [] }
}
const mockGiftCard = () => ({ code: "ABCD EFGH IJKL MNOP", last_four_characters: "MNOP", balance: 500000, initial_value: 500000, currency: "PKR", enabled: true, expired: false, expires_on: "2027-11-20", pass_url: null, qr_identifier: "ABCDEFGHIJKLMNOP", url: "/gift_cards/demo", product: null, customer: null })

// ---------------------------------------------------------------- HTTP
const MIME = { ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".ico": "image/x-icon", ".gif": "image/gif", ".avif": "image/avif" }
function sendFile(res, file, width) {
  // `?width=N` (from image_url/image_tag): serve a pre-sized variant from data/image-sizes.json when one exists.
  if (width) {
    const rel = "/" + file.slice(join(ROOT, "public").length + 1)
    const v = pickVariant(rel, width)
    if (v !== rel) file = join(ROOT, "public", v)
  }
  if (!existsSync(file) || !statSync(file).isFile()) return false
  res.writeHead(200, { "Content-Type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "no-cache" })
  createReadStream(file).pipe(res)
  return true
}
const send = (res, status, body, type = "text/html; charset=utf-8") => { res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" }); res.end(body) }
const sendJson = (res, status, obj) => send(res, status, JSON.stringify(obj), "application/json")
async function body(req) {
  const chunks = []; for await (const c of req) chunks.push(c)
  const raw = Buffer.concat(chunks).toString("utf8")
  const t = req.headers["content-type"] ?? ""
  if (t.includes("application/json")) return raw ? JSON.parse(raw) : {}
  if (t.includes("multipart/form-data")) {
    const out = {}; const b = /boundary=(.+)$/.exec(t)?.[1]
    for (const part of raw.split(`--${b}`)) { const m = /name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n$/.exec(part); if (m) out[m[1]] = m[2] }
    return out
  }
  return parseFormBody(raw)
}
// urlencoded bodies with Shopify's bracket conventions: `updates[]=5` (repeated → ordered array,
// matches Dawn's name="updates[]" and the documented /cart contract) and `updates[<key>]=5`
// (keyed object, variant id or cart line key) both come out right; plain `foo=bar` is untouched.
function parseFormBody(raw) {
  const out = {}
  for (const [key, value] of new URLSearchParams(raw)) {
    const m = /^([^[]+)\[([^\]]*)\]$/.exec(key)
    if (!m) { out[key] = value; continue }
    const [, base, sub] = m
    if (sub === "") {
      (out[base] = Array.isArray(out[base]) ? out[base] : []).push(value)
    } else {
      if (typeof out[base] !== "object" || Array.isArray(out[base])) out[base] = {}
      out[base][sub] = value
    }
  }
  return out
}

async function sectionsMap(req, res, url, ids) {
  const g = await globalsFor(req, res, url, { template: { name: "cart" } })
  const out = {}
  for (const id of String(ids).split(",").map((s) => s.trim()).filter(Boolean)) {
    out[id] = existsSync(join(THEME, "sections", `${id}.liquid`)) ? await renderSection(id, { id, type: id, settings: {} }, g, { static: true }) : null
  }
  return out
}

// Applies Shopify's two /cart[/update] update forms in place, then drops zero-quantity lines.
function applyCartUpdates(cart, updates) {
  if (Array.isArray(updates)) {
    updates.forEach((q, i) => { if (cart.items[i]) cart.items[i].quantity = Number(q) })
  } else if (updates && typeof updates === "object") {
    for (const [k, q] of Object.entries(updates)) {
      const li = cart.items.find((x) => x.key === k || String(x.id) === k)
      if (li) li.quantity = Number(q)
    }
  }
  cart.items = cart.items.filter((x) => x.quantity > 0)
}

let lineSeq = 0
async function cartApi(req, res, url, path) {
  const cat = await loadCatalog()
  const store = buildStore(cat)
  const cart = getCart(req, res)
  const isJs = path.endsWith(".js")
  const op = path.replace(/\.js$/, "")
  const finish = async (status, payload, sectionsParam) => {
    if (!isJs) { res.writeHead(302, { Location: "/cart" }); return res.end() }
    if (sectionsParam) payload.sections = await sectionsMap(req, res, url, sectionsParam)
    sendJson(res, status, payload)
  }
  if (req.method === "GET" && op === "/cart" && isJs) {
    const payload = cartJson(cartObject(store, cart))
    if (url.searchParams.get("sections")) payload.sections = await sectionsMap(req, res, url, url.searchParams.get("sections"))
    return sendJson(res, 200, payload)
  }
  const b = req.method === "POST" ? await body(req) : Object.fromEntries(url.searchParams)
  if (op === "/cart/add") {
    const items = b.items ?? [{ id: b.id, quantity: b.quantity ?? 1 }]
    const added = []
    for (const it of items) {
      const vid = Number(it.id)
      const v = store.products.flatMap((p) => p.variants).find((x) => x.id === vid)
      if (!v) return sendJson(res, 404, { status: 404, message: "Cart Error", description: "Cannot find variant" })
      if (!v.available) return sendJson(res, 422, { status: 422, message: "Cart Error", description: `The product '${v.name}' is already sold out.` })
      let li = cart.items.find((x) => x.id === vid)
      if (li) li.quantity += Number(it.quantity ?? 1)
      else cart.items.push((li = { key: `${vid}:local${++lineSeq}`, id: vid, quantity: Number(it.quantity ?? 1) }))
      added.push(li.key)
    }
    const c = cartJson(cartObject(store, cart))
    const payload = b.items ? { items: c.items.filter((i) => added.includes(i.key)) } : c.items.find((i) => i.key === added[0])
    return finish(200, payload, b.sections)
  }
  if (op === "/cart/change") {
    const q = Number(b.quantity ?? 0)
    let idx = b.line ? Number(b.line) - 1 : cart.items.findIndex((x) => x.key === String(b.id) || String(x.id) === String(b.id))
    if (idx < 0 || idx >= cart.items.length) return sendJson(res, 400, { status: 400, message: "Cart Error", description: "No valid id or line parameter" })
    if (q <= 0) cart.items.splice(idx, 1); else cart.items[idx].quantity = q
    return finish(200, cartJson(cartObject(store, cart)), b.sections)
  }
  // Both the documented Shopify contract (`/cart` form post with `updates[]`, ordered, one per
  // cart line — Dawn's name="updates[]") and the AJAX contract (`/cart/update(.js)` with
  // `updates[<key or variant id>]`) land here; a bare POST to `/cart` redirects back to it after
  // updating, matching Shopify (isJs is false for a plain form post, so `finish` redirects).
  if (op === "/cart" || op === "/cart/update") {
    applyCartUpdates(cart, b.updates)
    if (b.note != null) cart.note = b.note
    return finish(200, cartJson(cartObject(store, cart)), b.sections)
  }
  if (op === "/cart/clear") { cart.items = []; return finish(200, cartJson(cartObject(store, cart)), b.sections) }
  return null
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname
  try {
    if (path.startsWith("/theme-assets/")) {
      const name = decodeURIComponent(path.slice("/theme-assets/".length))
      if (sendFile(res, join(THEME, "assets", name.replace(/\.\./g, "")))) return
      return send(res, 404, "asset not found", "text/plain")
    }
    if (/^\/cart(\/(add|change|update|clear))?(\.js)?$/.test(path) && !(path === "/cart" && req.method === "GET")) {
      if ((await cartApi(req, res, url, path)) !== null || res.writableEnded) return
    }
    if (path === "/checkout" || path.startsWith("/cart/c")) return send(res, 200, `<p style="font:16px system-ui;padding:40px">Checkout isn't available in the local preview. <a href="/cart">Back to bag</a></p>`)
    if (path === "/contact" && req.method === "POST") { const back = (req.headers.referer ?? "/").split("?")[0].split("#")[0]; res.writeHead(302, { Location: `${back}?customer_posted=true#newsletter` }); return res.end() }
    if (path === "/account" || path.startsWith("/account/addresses") || path.startsWith("/account/orders")) { res.writeHead(302, { Location: "/account/login" }); return res.end() }
    if (path === "/account/logout") { res.writeHead(302, { Location: "/" }); return res.end() }
    if (path !== "/" && (extname(path) || (!path.startsWith("/products/") && !path.startsWith("/collections"))) && sendFile(res, join(ROOT, "public", decodeURIComponent(path).replace(/\.\./g, "")), Number(url.searchParams.get("width")) || 0)) return

    const cat = await loadCatalog()
    let r = route(path, buildStore(cat), url)
    let status = 200
    if (r?.need && !r.need(buildStore(cat))) r = null
    if (!r) { r = { template: "404" }; status = 404 }
    if (url.searchParams.get("section_id")) {
      const id = url.searchParams.get("section_id")
      const g = await globalsFor(req, res, url)
      if (r.objects) Object.assign(g, r.objects(g.store))
      return send(res, 200, await renderSection(id, { id, type: id, settings: {} }, g, { static: true }))
    }
    if (url.searchParams.get("sections") && req.method === "GET") return sendJson(res, 200, await sectionsMap(req, res, url, url.searchParams.get("sections")))
    const html = await renderPage(req, res, url, r)
    send(res, status, html)
  } catch (e) {
    console.error(`${req.method} ${req.url}\n`, e)
    send(res, 500, `<pre style="white-space:pre-wrap;padding:20px">Local preview error on ${esc(path)}:\n\n${esc(e.stack ?? e.message)}</pre>`)
  }
})

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Khuwabb theme local preview → http://127.0.0.1:${PORT}`)
  console.log("Mock data from data/products.json + data/shopify.json. Edits to theme/ show on reload.")
})

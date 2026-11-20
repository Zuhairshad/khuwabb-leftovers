// Steps. Each has plan(local) -> string[] (offline) and run(ctx) (reads; writes only when ctx.apply).
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { ROOT, DEFINITIONS, COLLECTIONS, MENUS, REDIRECTS, FILES, EMAIL } from "./data.mjs"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const mimeOf = (f) => (f.endsWith(".webp") ? "image/webp" : f.endsWith(".png") ? "image/png" : "image/jpeg")

// Stat + write helper. In dry-run prints what would happen; in apply runs fn.
async function act(ctx, st, label, fn, kind = "created") {
  st[kind] = (st[kind] ?? 0) + 1
  if (!ctx.apply) return console.log(`  [would] ${label}`)
  try { await fn(); console.log(`  [done]  ${label}`) } catch (e) { st.errors++; ctx.errors.push(`${label}: ${e.message}`); console.log(`  [ERROR] ${label}: ${e.message}`) }
}
const newStat = () => ({ created: 0, updated: 0, unchanged: 0, errors: 0 })

async function shopProducts(ctx) {
  if (ctx.cache.products) return ctx.cache.products
  const nodes = await ctx.api.all(async (after) => (await ctx.api.gql(`query($after:String){products(first:50,after:$after){nodes{id handle title productType descriptionHtml metafields(first:20,namespace:"custom"){nodes{key value type}}} pageInfo{hasNextPage endCursor}}}`, { after })).products)
  return (ctx.cache.products = new Map(nodes.map((n) => [n.handle, n])))
}

// ---------------------------------------------------------------- definitions
const definitions = {
  plan: () => DEFINITIONS.map((d) => `metafieldDefinitionCreate product custom.${d.key} (${d.type}) "${d.name}" pinned, storefront PUBLIC_READ`),
  async run(ctx) {
    const st = newStat()
    const existing = await ctx.api.gql(`query{metafieldDefinitions(ownerType:PRODUCT,namespace:"custom",first:100){nodes{id key type{name} pinnedPosition access{storefront}}}}`)
    const by = new Map(existing.metafieldDefinitions.nodes.map((n) => [n.key, n]))
    for (const d of DEFINITIONS) {
      const ex = by.get(d.key)
      if (!ex) {
        await act(ctx, st, `create definition custom.${d.key} (${d.type})`, () => ctx.api.mutate(
          `mutation($d:MetafieldDefinitionInput!){metafieldDefinitionCreate(definition:$d){createdDefinition{id} userErrors{field message code}}}`,
          { d: { name: d.name, namespace: "custom", key: d.key, description: d.description, type: d.type, ownerType: "PRODUCT", pin: true, access: { storefront: "PUBLIC_READ" } } }, "metafieldDefinitionCreate"))
        continue
      }
      let changed = false
      if (ex.type.name !== d.type) { ctx.errors.push(`definition custom.${d.key} exists with type ${ex.type.name}, wanted ${d.type} (types can't change; fix by hand)`); st.errors++; console.log(`  [ERROR] custom.${d.key} type mismatch ${ex.type.name} != ${d.type}`); continue }
      if (ex.access?.storefront !== "PUBLIC_READ") {
        changed = true
        await act(ctx, st, `set storefront PUBLIC_READ on custom.${d.key}`, () => ctx.api.mutate(
          `mutation($d:MetafieldDefinitionUpdateInput!){metafieldDefinitionUpdate(definition:$d){updatedDefinition{id} userErrors{field message code}}}`,
          { d: { namespace: "custom", key: d.key, ownerType: "PRODUCT", access: { storefront: "PUBLIC_READ" } } }, "metafieldDefinitionUpdate"), "updated")
      }
      if (ex.pinnedPosition == null) {
        changed = true
        await act(ctx, st, `pin custom.${d.key}`, () => ctx.api.mutate(
          `mutation($k:String!){metafieldDefinitionPin(identifier:{ownerType:PRODUCT,namespace:"custom",key:$k}){pinnedDefinition{id} userErrors{field message code}}}`,
          { k: d.key }, "metafieldDefinitionPin"), "updated")
      }
      if (!changed) st.unchanged++
    }
    return st
  },
}

// ------------------------------------------------------------------- products
function desiredMetafields(it) {
  const mf = []
  if (it.tint) mf.push({ key: "tint", type: "color", value: it.tint })
  if (it.categoryLine) mf.push({ key: "category_line", type: "single_line_text_field", value: it.categoryLine })
  if (it.fabric) mf.push({ key: "fabric", type: "single_line_text_field", value: it.fabric })
  if (it.care) mf.push({ key: "care", type: "multi_line_text_field", value: it.care })
  if (typeof it.sizeChart === "string" && it.sizeChart.trim())
    mf.push({ key: "size_guide", type: "rich_text_field", value: JSON.stringify({ type: "root", children: it.sizeChart.split(/\n{2,}/).map((t) => ({ type: "paragraph", children: [{ type: "text", value: t.trim() }] })) }) })
  return mf
}
const products = {
  plan: (local, flags) => [
    ...local.items.map((it) => `productUpdate ${it.handle}: productType="${it.productType}", custom.tint=${it.tint}${it.categoryLine ? `, custom.category_line="${it.categoryLine}"` : ""}${flags.descriptions && it.description ? ", descriptionHtml (only if empty in Shopify)" : ""}`),
    ...local.shopifyHandles.filter((h) => !local.items.some((i) => i.handle === h)).map((h) => `report: ${h} is in data/shopify.json but not data/products.json`),
  ],
  async run(ctx) {
    const st = newStat()
    const shop = await shopProducts(ctx)
    for (const it of ctx.local.items) {
      const sp = shop.get(it.handle)
      if (!sp) { console.log(`  [report] ${it.handle}: in products.json but NOT in Shopify`); st.errors++; ctx.errors.push(`product ${it.handle} missing in Shopify`); continue }
      const input = { id: sp.id }, diffs = []
      if (sp.productType !== it.productType) { input.productType = it.productType; diffs.push(`productType "${sp.productType}" → "${it.productType}"`) }
      const have = new Map(sp.metafields.nodes.map((m) => [m.key, m.value]))
      const mfs = desiredMetafields(it).filter((m) => (have.get(m.key) ?? "").toLowerCase() !== m.value.toLowerCase())
      if (mfs.length) { input.metafields = mfs.map((m) => ({ namespace: "custom", ...m })); diffs.push(...mfs.map((m) => `custom.${m.key} "${have.get(m.key) ?? ""}" → "${m.value.slice(0, 50)}"`)) }
      if (ctx.flags.descriptions && it.description && !sp.descriptionHtml.replace(/<[^>]*>/g, "").trim()) { input.descriptionHtml = `<p>${esc(it.description)}</p>`; diffs.push("descriptionHtml (was empty)") }
      if (!diffs.length) { st.unchanged++; if (ctx.verbose) console.log(`  [same]  ${it.handle}`); continue }
      await act(ctx, st, `${it.handle}: ${diffs.join("; ")}`, () => ctx.api.mutate(
        `mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id} userErrors{field message}}}`, { p: input }, "productUpdate"), "updated")
    }
    for (const [h] of shop) if (!ctx.local.items.some((i) => i.handle === h)) console.log(`  [report] ${h}: in Shopify but NOT in products.json (left untouched)`)
    return st
  },
}

// ---------------------------------------------------------------------- media
async function uploadStaged(ctx, files, resource = "IMAGE") {
  // files: [{path, filename}] -> [resourceUrl]
  const p = await ctx.api.mutate(
    `mutation($i:[StagedUploadInput!]!){stagedUploadsCreate(input:$i){stagedTargets{url resourceUrl parameters{name value}} userErrors{field message}}}`,
    { i: files.map((f) => ({ filename: f.filename, mimeType: mimeOf(f.filename), httpMethod: "POST", resource })) }, "stagedUploadsCreate")
  const urls = []
  for (let i = 0; i < files.length; i++) {
    const t = p.stagedTargets[i]
    const fd = new FormData()
    for (const { name, value } of t.parameters) fd.append(name, value)
    fd.append("file", new Blob([readFileSync(resolve(ROOT, files[i].path))], { type: mimeOf(files[i].filename) }), files[i].filename)
    const r = await fetch(t.url, { method: "POST", body: fd })
    if (!r.ok) throw new Error(`upload of ${files[i].filename} failed: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`)
    urls.push(t.resourceUrl)
  }
  return urls
}

const PRODUCT_MEDIA_Q = `query($ids:[ID!]!){nodes(ids:$ids){... on Product{id handle media(first:60){nodes{id alt status}} variants(first:100){nodes{id selectedOptions{name value} media(first:1){nodes{id}}}}}}}`
async function productMedia(ctx, id) {
  const d = await ctx.api.gql(PRODUCT_MEDIA_Q, { ids: [id] })
  return d.nodes[0]
}

const media = {
  plan: (local) => {
    const byP = {}
    for (const m of local.media) (byP[m.handle] ??= []).push(m)
    const lines = []
    for (const [h, ms] of Object.entries(byP)) {
      lines.push(`${h}: upload ${ms.length} images via stagedUploadsCreate + productUpdate(media): ${ms.map((m) => `"${m.alt}"`).join(", ")}`)
      const cols = [...new Set(ms.map((m) => m.colour))]
      lines.push(`${h}: productVariantAppendMedia — each variant → its colour's front image (${cols.join(", ")})`)
    }
    return lines
  },
  async run(ctx) {
    const st = newStat()
    const shop = await shopProducts(ctx)
    const byP = new Map()
    for (const m of ctx.local.media) byP.set(m.handle, [...(byP.get(m.handle) ?? []), m])
    for (const [handle, ms] of byP) {
      const sp = shop.get(handle)
      if (!sp) { console.log(`  [skip]  ${handle}: not in Shopify`); continue }
      let cur = await productMedia(ctx, sp.id)
      const haveAlts = new Set(cur.media.nodes.map((n) => n.alt))
      const missing = ms.filter((m) => !haveAlts.has(m.alt))
      st.unchanged += ms.length - missing.length
      if (missing.length) {
        await act(ctx, st, `${handle}: upload ${missing.length} image(s): ${missing.map((m) => m.alt).join(", ")}`, async () => {
          const urls = await uploadStaged(ctx, missing.map((m) => ({ path: m.file, filename: m.filename })))
          await ctx.api.mutate(
            `mutation($p:ProductUpdateInput!,$m:[CreateMediaInput!]){productUpdate(product:$p,media:$m){product{id} userErrors{field message}}}`,
            { p: { id: sp.id }, m: missing.map((m, i) => ({ originalSource: urls[i], alt: m.alt, mediaContentType: "IMAGE" })) }, "productUpdate")
        })
        if (ctx.apply) cur = await productMedia(ctx, sp.id)
      }
      // variant → front image of its colour
      const front = new Map(cur.media.nodes.filter((n) => / \| front$/.test(n.alt ?? "")).map((n) => [n.alt.replace(/ \| front$/, ""), n]))
      const links = []
      for (const v of cur.variants.nodes) {
        const colour = v.selectedOptions.find((o) => o.name === "Color")?.value
        const f = front.get(colour)
        if (!f) { if (ctx.apply || missing.length === 0) console.log(`  [warn]  ${handle}: no front image for variant colour "${colour}"`); continue }
        if (v.media.nodes[0]?.id === f.id) { st.unchanged++; continue }
        links.push({ variantId: v.id, mediaIds: [f.id], f })
      }
      if (ctx.apply && links.length) {
        // media must be READY before it can be attached
        for (let i = 0; i < 40; i++) {
          const m = (await productMedia(ctx, sp.id)).media.nodes
          if (links.every((l) => m.find((x) => x.id === l.f.id)?.status === "READY")) break
          if (i === 39) { ctx.errors.push(`${handle}: media not READY after waiting; re-run to attach variants`); st.errors++ }
          await sleep(3000)
        }
      }
      if (links.length) await act(ctx, st, `${handle}: set media on ${links.length} variant(s)`, () => ctx.api.mutate(
        `mutation($p:ID!,$v:[ProductVariantAppendMediaInput!]!){productVariantAppendMedia(productId:$p,variantMedia:$v){userErrors{field message}}}`,
        { p: sp.id, v: links.map(({ variantId, mediaIds }) => ({ variantId, mediaIds })) }, "productVariantAppendMedia"), "updated")
    }
    return st
  },
}

// ---------------------------------------------------------------- collections
const collections = {
  plan: (local) => [
    ...COLLECTIONS.map((c) => c.manual
      ? `collectionCreate "${c.title}" (${c.handle}) manual, + collectionAddProducts for ${local.items.filter((i) => i.newIn).length} newIn products`
      : `collectionCreate "${c.title}" (${c.handle}) smart: product type = "${c.type}"`),
    `publishablePublish ${COLLECTIONS.length} collections to the Online Store publication`,
  ],
  async run(ctx) {
    const st = newStat()
    const pubs = (await ctx.api.gql(`query{publications(first:20){nodes{id name}}}`)).publications.nodes
    const online = pubs.find((p) => p.name === "Online Store")
    if (!online) { ctx.errors.push(`no "Online Store" publication found (have: ${pubs.map((p) => p.name).join(", ")})`); st.errors++ }
    const shop = await shopProducts(ctx)
    const Q = `query($h:String!,$pub:ID!){collectionByIdentifier(identifier:{handle:$h}){id title ruleSet{appliedDisjunctively rules{column relation condition}} products(first:250){nodes{id}} publishedOnPublication(publicationId:$pub)}}`
    for (const c of COLLECTIONS) {
      let ex = (await ctx.api.gql(Q, { h: c.handle, pub: online?.id ?? "gid://shopify/Publication/0" })).collectionByIdentifier
      let id = ex?.id
      if (!ex) {
        const input = { title: c.title, handle: c.handle }
        if (!c.manual) input.ruleSet = { appliedDisjunctively: false, rules: [{ column: "TYPE", relation: "EQUALS", condition: c.type }] }
        await act(ctx, st, `create ${c.manual ? "manual" : "smart"} collection "${c.title}" (${c.handle})`, async () => {
          id = (await ctx.api.mutate(`mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id} userErrors{field message}}}`, { i: input }, "collectionCreate")).collection.id
        })
      } else {
        const r = ex.ruleSet?.rules ?? []
        const ok = c.manual ? !ex.ruleSet : r.length === 1 && r[0].column === "TYPE" && r[0].relation === "EQUALS" && r[0].condition === c.type
        if (!ok) { st.errors++; ctx.errors.push(`collection ${c.handle} exists with different type/rules; fix by hand (not auto-changed)`); console.log(`  [ERROR] ${c.handle} exists with different rules`) }
        else st.unchanged++
      }
      if (c.manual) {
        const want = ctx.local.items.filter((i) => i.newIn).map((i) => shop.get(i.handle)?.id).filter(Boolean)
        const have = new Set((ex?.products.nodes ?? []).map((n) => n.id))
        const add = want.filter((x) => !have.has(x))
        if (add.length) await act(ctx, st, `${c.handle}: add ${add.length} product(s)`, async () => {
          if (!id) return
          await ctx.api.mutate(`mutation($id:ID!,$p:[ID!]!){collectionAddProducts(id:$id,productIds:$p){collection{id} userErrors{field message}}}`, { id, p: add }, "collectionAddProducts")
        }, "updated")
      }
      if (online && !ex?.publishedOnPublication) await act(ctx, st, `publish "${c.handle}" to Online Store`, async () => {
        if (!id) return
        await ctx.api.mutate(`mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{field message}}}`, { id, i: [{ publicationId: online.id }] }, "publishablePublish")
      }, "updated")
    }
    return st
  },
}

// ---------------------------------------------------------------------- menus
const norm = (u) => (u ?? "").replace(/^https?:\/\/[^/]+/i, "").replace(/\/$/, "") || "/"
const menus = {
  plan: () => MENUS.map((m) => `menu ${m.handle} "${m.title}": menuCreate/menuUpdate items → ${m.items.map(([t, u]) => `${t} (${u})`).join(", ")}`),
  async run(ctx) {
    const st = newStat()
    const existing = await ctx.api.all(async (after) => (await ctx.api.gql(`query($after:String){menus(first:50,after:$after){nodes{id handle title items{title url}} pageInfo{hasNextPage endCursor}}}`, { after })).menus)
    for (const m of MENUS) {
      const items = m.items.map(([title, url]) => url === "/" ? { title, type: "FRONTPAGE" } : { title, type: "HTTP", url })
      const ex = existing.find((e) => e.handle === m.handle)
      if (!ex) { await act(ctx, st, `create menu ${m.handle}`, () => ctx.api.mutate(`mutation($t:String!,$h:String!,$i:[MenuItemCreateInput!]!){menuCreate(title:$t,handle:$h,items:$i){menu{id} userErrors{field message}}}`, { t: m.title, h: m.handle, i: items }, "menuCreate")); continue }
      const same = ex.items.length === m.items.length && m.items.every(([t, u], i) => ex.items[i].title === t && norm(ex.items[i].url) === norm(u))
      if (same) { st.unchanged++; continue }
      await act(ctx, st, `replace items of menu ${m.handle} (${ex.items.map((i) => i.title).join(", ") || "empty"} → ${m.items.map((i) => i[0]).join(", ")})`, () =>
        ctx.api.mutate(`mutation($id:ID!,$t:String!,$h:String!,$i:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,items:$i){menu{id} userErrors{field message}}}`, { id: ex.id, t: m.title === "Main menu" ? ex.title : m.title, h: m.handle, i: items }, "menuUpdate"), "updated")
    }
    return st
  },
}

// ------------------------------------------------------------------ redirects
const redirects = {
  plan: () => REDIRECTS.map(([a, b]) => `urlRedirectCreate ${a} → ${b}`),
  async run(ctx) {
    const st = newStat()
    const ex = await ctx.api.all(async (after) => (await ctx.api.gql(`query($after:String){urlRedirects(first:250,after:$after){nodes{id path target} pageInfo{hasNextPage endCursor}}}`, { after })).urlRedirects)
    for (const [path, target] of REDIRECTS) {
      const e = ex.find((r) => r.path === path)
      if (!e) await act(ctx, st, `redirect ${path} → ${target}`, () => ctx.api.mutate(`mutation($r:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$r){urlRedirect{id} userErrors{field message}}}`, { r: { path, target } }, "urlRedirectCreate"))
      else if (norm(e.target) !== norm(target)) await act(ctx, st, `update redirect ${path}: ${e.target} → ${target}`, () => ctx.api.mutate(`mutation($id:ID!,$r:UrlRedirectInput!){urlRedirectUpdate(id:$id,urlRedirect:$r){urlRedirect{id} userErrors{field message}}}`, { id: e.id, r: { target } }, "urlRedirectUpdate"), "updated")
      else st.unchanged++
    }
    return st
  },
}

// ---------------------------------------------------------------------- files
const files = {
  optional: true,
  plan: () => FILES.map(([p, n]) => `fileCreate ${p} as "${n}" (stagedUploadsCreate + fileCreate)`),
  async run(ctx) {
    const st = newStat()
    for (const [path, filename] of FILES) {
      const d = await ctx.api.gql(`query($q:String!){files(first:10,query:$q){nodes{id ... on MediaImage{image{url}}}}}`, { q: `filename:${filename.replace(/\.[^.]+$/, "")}*` })
      const base = filename.replace(/\.[^.]+$/, "")
      const found = d.files.nodes.some((n) => new RegExp(`/${base}(_[0-9a-f-]+)?\\.`, "i").test(n.image?.url ?? ""))
      if (found) { st.unchanged++; continue }
      await act(ctx, st, `upload file ${filename}`, async () => {
        const [url] = await uploadStaged(ctx, [{ path, filename }])
        await ctx.api.mutate(`mutation($f:[FileCreateInput!]!){fileCreate(files:$f){files{id} userErrors{field message}}}`, { f: [{ originalSource: url, filename, contentType: "IMAGE", alt: filename.replace(/\.[^.]+$/, "").replace(/-/g, " ") }] }, "fileCreate")
      })
    }
    return st
  },
}

export const STEPS = { definitions, products, media, collections, menus, redirects, files }
export const DEFAULT_STEPS = ["definitions", "products", "media", "collections", "menus", "redirects"]
export { EMAIL }

// Steps. Each has plan(local, flags) -> string[] (offline, each line tagged [additive] /
// [go-live] / [publish-new-collections] / [report-only]) and run(ctx) (reads; writes only
// when ctx.apply, and only the ops its tag allows for the current flags).
//
// Default --apply is additive-only: it may only add things a customer can't see yet (new
// metafield values where none existed, new UNPUBLISHED collections, new menus/pages/definitions).
// --go-live unlocks the customer-visible / data-changing ops (publishing, media, productType,
// descriptions, redirects, pinning+storefront access on existing definitions).
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { ROOT, DEFINITIONS, COLLECTIONS, MENUS, PAGES, REDIRECTS, FILES, EMAIL, SHOPIFY_ONLY_TINTS } from "./data.mjs"
import { collectionsCreatedByScript } from "./undo-log.mjs"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const mimeOf = (f) => (f.endsWith(".webp") ? "image/webp" : f.endsWith(".png") ? "image/png" : "image/jpeg")

// Stat + write helper. In dry-run (or when the op's gate is closed) prints what would happen;
// in apply (with the gate open) runs fn and, if undoMeta is given, writes pending→done/failed
// to the run's undo log.
async function act(ctx, st, label, fn, kind = "created", undoMeta = null) {
  st[kind] = (st[kind] ?? 0) + 1
  if (!ctx.apply) return console.log(`  [would] ${label}`)
  let pendingId = null
  if (undoMeta && ctx.undoLog) pendingId = ctx.undoLog.pending({ step: undoMeta.step, op: undoMeta.op, target: undoMeta.target, before: undoMeta.before ?? null }).id
  try {
    const result = await fn()
    console.log(`  [done]  ${label}`)
    if (undoMeta && ctx.undoLog) {
      const extra = undoMeta.after ? (await undoMeta.after(result)) ?? {} : {}
      ctx.undoLog.done({ id: pendingId, step: undoMeta.step, op: undoMeta.op, target: undoMeta.target, before: undoMeta.before ?? null, after: extra.after, createdIds: extra.createdIds, undo: extra.undo })
    }
    return result
  } catch (e) {
    st.errors++; ctx.errors.push(`${label}: ${e.message}`); console.log(`  [ERROR] ${label}: ${e.message}`)
    if (undoMeta && ctx.undoLog) ctx.undoLog.failed({ id: pendingId, step: undoMeta.step, op: undoMeta.op, target: undoMeta.target, before: undoMeta.before ?? null, message: e.message })
  }
}
// Report-only line (never writes, never gated): used for "report only" behaviours.
function report(ctx, msg) { console.log(`  [report] ${msg}`) }
const newStat = () => ({ created: 0, updated: 0, unchanged: 0, errors: 0 })

async function shopProducts(ctx) {
  if (ctx.cache.products) return ctx.cache.products
  // No sortKey is given, so this relies on the Admin API's default product order (documented as
  // ID ascending, same default as the Storefront `products` query that scripts/sync-shopify.mjs
  // uses to build data/shopify.json); needed so the Shopify-only tint rotation below lines up
  // with lib/catalog.ts's. UNTESTED against a live store; verify order before trusting go-live.
  const nodes = await ctx.api.all(async (after) => (await ctx.api.gql(`query($after:String){products(first:50,after:$after){nodes{id handle title productType descriptionHtml tags metafields(first:20,namespace:"custom"){nodes{key value type}}} pageInfo{hasNextPage endCursor}}}`, { after })).products)
  return (ctx.cache.products = new Map(nodes.map((n) => [n.handle, n])))
}

// ---------------------------------------------------------------- definitions
const definitions = {
  plan: () => DEFINITIONS.flatMap((d) => [
    `[additive] create definition custom.${d.key} (${d.type}) "${d.name}" if missing`,
    `[go-live] on an EXISTING custom.${d.key}: set storefront PUBLIC_READ + pin (default mode only reports this; type mismatch is always an error either way)`,
  ]),
  async run(ctx) {
    const st = newStat()
    const existing = await ctx.api.gql(`query{metafieldDefinitions(ownerType:PRODUCT,namespace:"custom",first:100){nodes{id key type{name} pinnedPosition access{storefront}}}}`)
    const by = new Map(existing.metafieldDefinitions.nodes.map((n) => [n.key, n]))
    for (const d of DEFINITIONS) {
      const ex = by.get(d.key)
      if (!ex) {
        await act(ctx, st, `create definition custom.${d.key} (${d.type})`, () => ctx.api.mutate(
          `mutation($d:MetafieldDefinitionInput!){metafieldDefinitionCreate(definition:$d){createdDefinition{id} userErrors{field message code}}}`,
          { d: { name: d.name, namespace: "custom", key: d.key, description: d.description, type: d.type, ownerType: "PRODUCT", pin: true, access: { storefront: "PUBLIC_READ" } } }, "metafieldDefinitionCreate"),
          "created",
          { step: "definitions", op: "metafieldDefinitionCreate", target: `custom.${d.key}`, before: null,
            after: (p) => ({ after: { id: p.createdDefinition.id }, createdIds: [p.createdDefinition.id], undo: { mutation: "metafieldDefinitionDelete", variables: { id: p.createdDefinition.id, deleteAllAssociatedMetafields: false } } }) })
        continue
      }
      if (ex.type.name !== d.type) { ctx.errors.push(`definition custom.${d.key} exists with type ${ex.type.name}, wanted ${d.type} (types can't change; fix by hand)`); st.errors++; console.log(`  [ERROR] custom.${d.key} type mismatch ${ex.type.name} != ${d.type}`); continue }
      const wantsAccess = ex.access?.storefront !== "PUBLIC_READ", wantsPin = ex.pinnedPosition == null
      if (!wantsAccess && !wantsPin) { st.unchanged++; continue }
      if (!ctx.goLive) {
        report(ctx, `custom.${d.key} exists${wantsAccess ? "; storefront access is not PUBLIC_READ" : ""}${wantsPin ? "; not pinned" : ""}, would set with --go-live`)
        st.unchanged++
        continue
      }
      if (wantsAccess) await act(ctx, st, `set storefront PUBLIC_READ on custom.${d.key}`, () => ctx.api.mutate(
        `mutation($d:MetafieldDefinitionUpdateInput!){metafieldDefinitionUpdate(definition:$d){updatedDefinition{id} userErrors{field message code}}}`,
        { d: { namespace: "custom", key: d.key, ownerType: "PRODUCT", access: { storefront: "PUBLIC_READ" } } }, "metafieldDefinitionUpdate"), "updated",
        { step: "definitions", op: "metafieldDefinitionUpdate", target: `custom.${d.key}`, before: { access: ex.access ?? null },
          after: () => ({ after: { access: { storefront: "PUBLIC_READ" } }, undo: { mutation: "metafieldDefinitionUpdate", variables: { d: { namespace: "custom", key: d.key, ownerType: "PRODUCT", access: { storefront: ex.access?.storefront ?? "NONE" } } } } }) })
      if (wantsPin) await act(ctx, st, `pin custom.${d.key}`, () => ctx.api.mutate(
        `mutation($k:String!){metafieldDefinitionPin(identifier:{ownerType:PRODUCT,namespace:"custom",key:$k}){pinnedDefinition{id} userErrors{field message code}}}`,
        { k: d.key }, "metafieldDefinitionPin"), "updated",
        { step: "definitions", op: "metafieldDefinitionPin", target: `custom.${d.key}`, before: { pinnedPosition: null },
          after: () => ({ after: { pinned: true }, undo: { mutation: "metafieldDefinitionUnpin", variables: { identifier: { ownerType: "PRODUCT", namespace: "custom", key: d.key } } } }) })
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
    `[additive] per product: write custom.tint/category_line/fabric/care/size_guide ONLY for keys that are currently unset in Shopify (existing different value → report "[skip] differs", never overwritten, even with --go-live)`,
    `[go-live] per product: productType → category (default mode only reports a mismatch)`,
    ...(flags.descriptions ? [`[go-live] --descriptions: fill descriptionHtml only where Shopify's is empty (default mode, even with --descriptions, only reports)`] : []),
    `[additive] Shopify-only products (not in products.json, by handle): write custom.tint ONLY if currently unset, rotating through the same 5 pastels as lib/catalog.ts's TINTS, assigned by index in the live Admin API product list order after removing products.json-covered handles (mirrors lib/catalog.ts's Object.entries(data/shopify.json.products) ordering); an existing different value is reported "[skip] differs", never overwritten`,
    ...local.shopifyHandles.filter((h) => !local.items.some((i) => i.handle === h)).map((h) => `[report-only] ${h} is in data/shopify.json but not data/products.json`),
  ],
  async run(ctx) {
    const st = newStat()
    const shop = await shopProducts(ctx)
    for (const it of ctx.local.items) {
      const sp = shop.get(it.handle)
      if (!sp) { report(ctx, `${it.handle}: in products.json but NOT in Shopify`); st.errors++; ctx.errors.push(`product ${it.handle} missing in Shopify`); continue }
      const have = new Map(sp.metafields.nodes.map((m) => [m.key, m.value]))
      const input = { id: sp.id }
      const sets = [], skips = []
      for (const m of desiredMetafields(it)) {
        const cur = have.get(m.key)
        if (cur == null || cur === "") sets.push(m)
        else if (cur.toLowerCase() !== m.value.toLowerCase()) skips.push({ key: m.key, cur })
      }
      for (const s of skips) report(ctx, `${it.handle}: custom.${s.key} differs ("${s.cur}" vs desired "${(desiredMetafields(it).find((m) => m.key === s.key) ?? {}).value}"), [skip] differs, never overwritten; review by hand`)
      const diffs = []
      if (sets.length) { input.metafields = sets.map((m) => ({ namespace: "custom", ...m })); diffs.push(...sets.map((m) => `custom.${m.key} (was unset) → "${m.value.slice(0, 50)}"`)) }
      let typeChangeOnly = false
      if (sp.productType !== it.productType) {
        if (ctx.goLive) { input.productType = it.productType; diffs.push(`productType "${sp.productType}" → "${it.productType}"`) }
        else { report(ctx, `${it.handle}: productType "${sp.productType}" → "${it.productType}", would set with --go-live`); typeChangeOnly = true }
      }
      if (ctx.flags.descriptions) {
        const empty = !sp.descriptionHtml?.replace(/<[^>]*>/g, "").trim()
        if (empty && it.description) {
          if (ctx.goLive) { input.descriptionHtml = `<p>${esc(it.description)}</p>`; diffs.push("descriptionHtml (was empty)") }
          else report(ctx, `${it.handle}: descriptionHtml is empty, would fill with --go-live --descriptions`)
        }
      }
      if (!diffs.length) { if (!typeChangeOnly) st.unchanged++; continue }
      const before = { productType: sp.productType, metafields: sets.map((m) => ({ key: m.key, value: have.get(m.key) ?? null })) }
      await act(ctx, st, `${it.handle}: ${diffs.join("; ")}`, () => ctx.api.mutate(
        `mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id} userErrors{field message}}}`, { p: input }, "productUpdate"), "updated",
        { step: "products", op: "productUpdate", target: it.handle, before,
          // undo is a LIST of ops, run in reverse by undo.mjs: one metafieldsDelete per key
          // that had no prior value (there's nothing to "restore", it didn't exist), plus a
          // productUpdate restoring productType, only when productType was actually changed.
          after: () => {
            const undo = sets.map((m) => ({ mutation: "metafieldsDelete", variables: { metafields: [{ ownerId: sp.id, namespace: "custom", key: m.key }] } }))
            if (input.productType) undo.push({ mutation: "productUpdate", variables: { p: { id: sp.id, productType: sp.productType } } })
            return { after: { productType: input.productType ?? sp.productType, metafieldsSet: sets.map((m) => m.key) }, undo }
          } })
    }
    // Shopify-only products (exist live, no products.json entry): rotate custom.tint through
    // the same 5 pastels lib/catalog.ts uses for them, in the same index order: the live
    // product list here in place of data/shopify.json's. Unset-only, same as every other field
    // above: an existing different value is reported, never overwritten.
    const coveredHandles = new Set(ctx.local.items.map((i) => i.handle))
    let tintIndex = 0
    for (const [h, sp] of shop) {
      if (coveredHandles.has(h)) continue
      const tint = SHOPIFY_ONLY_TINTS[tintIndex % SHOPIFY_ONLY_TINTS.length]
      const idx = tintIndex++
      report(ctx, `${h}: in Shopify but NOT in products.json (left untouched, except custom.tint below)`)
      const have = new Map(sp.metafields.nodes.map((m) => [m.key, m.value]))
      const cur = have.get("tint")
      if (cur != null && cur !== "") {
        if (cur.toLowerCase() !== tint.toLowerCase()) report(ctx, `${h}: custom.tint differs ("${cur}" vs desired "${tint}", rotation index ${idx}), [skip] differs, never overwritten; review by hand`)
        else st.unchanged++
        continue
      }
      await act(ctx, st, `${h}: custom.tint (was unset) → "${tint}" [Shopify-only, rotation index ${idx}]`, () => ctx.api.mutate(
        `mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id} userErrors{field message}}}`,
        { p: { id: sp.id, metafields: [{ namespace: "custom", key: "tint", type: "color", value: tint }] } }, "productUpdate"), "updated",
        { step: "products", op: "productUpdate", target: h, before: { metafields: [{ key: "tint", value: null }] },
          after: () => ({ after: { metafieldsSet: ["tint"] }, undo: [{ mutation: "metafieldsDelete", variables: { metafields: [{ ownerId: sp.id, namespace: "custom", key: "tint" }] } }] }) })
    }
    return st
  },
}

// ---------------------------------------------------------------------- media
async function uploadStaged(ctx, files, resource = "IMAGE") {
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
  // Customer-visible in the live theme's gallery → go-live only. Default mode only reports.
  plan: (local) => {
    const byP = {}
    for (const m of local.media) (byP[m.handle] ??= []).push(m)
    const lines = []
    for (const [h, ms] of Object.entries(byP)) {
      lines.push(`[go-live] ${h}: upload ${ms.length} images via stagedUploadsCreate + productUpdate(media) (default mode only reports): ${ms.map((m) => `"${m.alt}"`).join(", ")}`)
      const cols = [...new Set(ms.map((m) => m.colour))]
      lines.push(`[go-live] ${h}: productVariantAppendMedia: each variant → its colour's front image (${cols.join(", ")}); a variant with a DIFFERENT media already attached is skipped and reported, never detached`)
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
      if (!sp) { report(ctx, `${handle}: not in Shopify`); continue }
      let cur = await productMedia(ctx, sp.id)
      const haveAlts = new Set(cur.media.nodes.map((n) => n.alt))
      const missing = ms.filter((m) => !haveAlts.has(m.alt))
      st.unchanged += ms.length - missing.length
      if (missing.length) {
        if (!ctx.goLive) { report(ctx, `${handle}: ${missing.length} image(s) not yet uploaded (would upload with --go-live): ${missing.map((m) => m.alt).join(", ")}`); st.unchanged += missing.length }
        else {
          const beforeIds = cur.media.nodes.map((n) => n.id)
          await act(ctx, st, `${handle}: upload ${missing.length} image(s): ${missing.map((m) => m.alt).join(", ")}`, async () => {
            const urls = await uploadStaged(ctx, missing.map((m) => ({ path: m.file, filename: m.filename })))
            await ctx.api.mutate(
              `mutation($p:ProductUpdateInput!,$m:[CreateMediaInput!]){productUpdate(product:$p,media:$m){product{id media(first:60){nodes{id}}} userErrors{field message}}}`,
              { p: { id: sp.id }, m: missing.map((m, i) => ({ originalSource: urls[i], alt: m.alt, mediaContentType: "IMAGE" })) }, "productUpdate")
          }, "created",
            { step: "media", op: "productUpdate", target: handle, before: { mediaIds: beforeIds },
              after: async () => {
                const after = await productMedia(ctx, sp.id)
                const createdIds = after.media.nodes.map((n) => n.id).filter((id) => !beforeIds.includes(id))
                return { after: { mediaIds: after.media.nodes.map((n) => n.id) }, createdIds,
                  undo: { mutation: "fileDelete", variables: { fileIds: createdIds }, note: "fileDelete also removes product media ids on recent API versions; productDeleteMedia(productId, mediaIds) is the alternative if that stops working" } }
              } })
          cur = await productMedia(ctx, sp.id)
        }
      }
      const front = new Map(cur.media.nodes.filter((n) => / \| front$/.test(n.alt ?? "")).map((n) => [n.alt.replace(/ \| front$/, ""), n]))
      const links = []
      for (const v of cur.variants.nodes) {
        const colour = v.selectedOptions.find((o) => o.name === "Color")?.value
        const f = front.get(colour)
        if (!f) { if (ctx.goLive) report(ctx, `${handle}: no front image for variant colour "${colour}"`); continue }
        const existingId = v.media.nodes[0]?.id
        if (existingId === f.id) { st.unchanged++; continue }
        if (existingId) { report(ctx, `${handle}: variant "${colour}" already has a different media (${existingId}) attached, skipped, not detached; review by hand`); continue }
        links.push({ variantId: v.id, mediaIds: [f.id], f })
      }
      if (!links.length) continue
      if (!ctx.goLive) { report(ctx, `${handle}: ${links.length} variant(s) would be linked to media with --go-live`); st.unchanged += links.length; continue }
      for (let i = 0; i < 40; i++) {
        const m = (await productMedia(ctx, sp.id)).media.nodes
        if (links.every((l) => m.find((x) => x.id === l.f.id)?.status === "READY")) break
        if (i === 39) { ctx.errors.push(`${handle}: media not READY after waiting; re-run to attach variants`); st.errors++ }
        await sleep(3000)
      }
      await act(ctx, st, `${handle}: set media on ${links.length} variant(s)`, () => ctx.api.mutate(
        `mutation($p:ID!,$v:[ProductVariantAppendMediaInput!]!){productVariantAppendMedia(productId:$p,variantMedia:$v){userErrors{field message}}}`,
        { p: sp.id, v: links.map(({ variantId, mediaIds }) => ({ variantId, mediaIds })) }, "productVariantAppendMedia"), "updated",
        { step: "media", op: "productVariantAppendMedia", target: handle, before: { variants: links.map((l) => ({ variantId: l.variantId, mediaId: null })) },
          after: () => ({ after: { variants: links.map((l) => ({ variantId: l.variantId, mediaId: l.mediaIds[0] })) },
            undo: { mutation: "productVariantDetachMedia", variables: { productId: sp.id, variantMedia: links.map((l) => ({ variantId: l.variantId, mediaIds: l.mediaIds })) }, note: "variants skipped above (different media already attached) are not touched, so there is nothing to re-append on undo" } }) })
    }
    return st
  },
}

// ---------------------------------------------------------------- collections
const ruleSetFor = (c) => c.manual ? null
  : c.tag ? { appliedDisjunctively: true, rules: [{ column: "TAG", relation: "EQUALS", condition: c.tag }] }
  : { appliedDisjunctively: false, rules: [{ column: "TYPE", relation: "EQUALS", condition: c.type }] }
const describeWanted = (c) => c.manual ? "manual"
  : c.tag ? `automated, rule TAG equals "${c.tag}" (disjunctive)${c.sortOrder ? `, sortOrder ${c.sortOrder}` : ""}`
  : `automated, rule TYPE equals "${c.type}"`
const describeExisting = (ex) => ex.ruleSet
  ? `rule ${ex.ruleSet.rules.map((r) => `${r.column} ${r.relation} ${r.condition}`).join(" & ")} (disjunctive=${ex.ruleSet.appliedDisjunctively}), sortOrder ${ex.sortOrder ?? "unknown"}`
  : "manual (no rule)"

const collections = {
  plan: (local, flags) => [
    ...COLLECTIONS.map((c) => c.manual
      ? `[additive] create manual collection "${c.title}" (${c.handle}) UNPUBLISHED if its handle doesn't exist yet; add ${local.items.filter((i) => i.newIn).length} newIn product(s) [additive, only if this script created it]`
      : c.tag
        ? `[additive] create automated collection "${c.title}" (${c.handle}) UNPUBLISHED if its handle doesn't exist yet: rule TAG equals "${c.tag}" (disjunctive), sortOrder ${c.sortOrder}, built with the legacy CollectionInput.ruleSet shape (Collection.ruleSet is deprecated in 2026-10 in favour of CollectionCreateInput.sources, but ruleSet is still documented as functional; the sources shape is unverified against this store, so ruleSet was kept for consistency with the TYPE collections below, see README)`
        : `[additive] create smart collection "${c.title}" (${c.handle}) UNPUBLISHED if its handle doesn't exist yet: product type = "${c.type}"`),
    `[additive] give every products.json product with newIn:true the Shopify tag "new-in" (tagsAdd, never removes other tags) if it doesn't already have it: keeps it in the "new-in" collection now that collection's rule is TAG equals "new-in", and matches the storefront's own tag-based newIn check`,
    `[report-only] if a collection's handle already exists: report only, never add products, publish, or change its rules/sortOrder (for "new-in": reports exactly what would need to change, convert to automated TAG equals "new-in" + sortOrder CREATED_DESC, if it's still the old manual collection)`,
    `[publish-new-collections / go-live] publish ONLY collections this script created (recorded in this run or in tools/store-setup/out/undo-*.jsonl) to the Online Store publication; a pre-existing collection is never published by this script`,
  ],
  async run(ctx) {
    const st = newStat()
    const pubs = (await ctx.api.gql(`query{publications(first:20){nodes{id name}}}`)).publications.nodes
    const online = pubs.find((p) => p.name === "Online Store")
    if (!online) { ctx.errors.push(`no "Online Store" publication found (have: ${pubs.map((p) => p.name).join(", ")})`); st.errors++ }
    const shop = await shopProducts(ctx)
    const scriptCreated = new Set(ctx.store ? collectionsCreatedByScript(ctx.store) : [])
    // Additive, independent of collection creation/existence: every products.json newIn product
    // gets the Shopify tag "new-in" if it doesn't have it yet (tagsAdd only adds; it never
    // touches other tags). This is what keeps newIn products in "new-in" once that collection's
    // rule is TAG equals "new-in" (see COLLECTIONS in lib/data.mjs), and it mirrors the
    // storefront's own tag-based `newIn` check in lib/catalog.ts.
    for (const it of ctx.local.items.filter((i) => i.newIn)) {
      const sp = shop.get(it.handle)
      if (!sp) continue // already reported as missing-from-Shopify by the products step
      if ((sp.tags ?? []).includes("new-in")) { st.unchanged++; continue }
      await act(ctx, st, `${it.handle}: add tag "new-in" (tagsAdd)`, () => ctx.api.mutate(
        `mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){node{id} userErrors{field message}}}`,
        { id: sp.id, t: ["new-in"] }, "tagsAdd"), "updated",
        { step: "collections", op: "tagsAdd", target: it.handle, before: { tags: sp.tags ?? [] },
          after: () => ({ after: { tags: [...(sp.tags ?? []), "new-in"] }, undo: { mutation: "tagsRemove", variables: { id: sp.id, tags: ["new-in"] } } }) })
    }
    const Q = `query($h:String!,$pub:ID!){collectionByIdentifier(identifier:{handle:$h}){id title sortOrder ruleSet{appliedDisjunctively rules{column relation condition}} products(first:250){nodes{id}} publishedOnPublication(publicationId:$pub)}}`
    for (const c of COLLECTIONS) {
      let ex = (await ctx.api.gql(Q, { h: c.handle, pub: online?.id ?? "gid://shopify/Publication/0" })).collectionByIdentifier
      let id = ex?.id
      let createdThisRun = false
      if (!ex) {
        const input = { title: c.title, handle: c.handle }
        const rs = ruleSetFor(c)
        if (rs) input.ruleSet = rs
        if (c.sortOrder) input.sortOrder = c.sortOrder
        await act(ctx, st, `create ${c.manual ? "manual" : "automated"} collection "${c.title}" (${c.handle}) [UNPUBLISHED]`, async () => {
          const r = await ctx.api.mutate(`mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id} userErrors{field message}}}`, { i: input }, "collectionCreate")
          id = r.collection.id
          return r
        }, "created",
          { step: "collections", op: "collectionCreate", target: c.handle, before: null,
            after: () => ({ after: { id }, createdIds: [id], undo: { mutation: "collectionDelete", variables: { input: { id } } } }) })
        if (id) { createdThisRun = true; scriptCreated.add(c.handle) }
      } else {
        const r = ex.ruleSet?.rules ?? []
        const ok = c.manual ? !ex.ruleSet
          : c.tag ? ex.ruleSet?.appliedDisjunctively === true && r.length === 1 && r[0].column === "TAG" && r[0].relation === "EQUALS" && r[0].condition === c.tag && (!c.sortOrder || ex.sortOrder === c.sortOrder)
          : r.length === 1 && r[0].column === "TYPE" && r[0].relation === "EQUALS" && r[0].condition === c.type
        if (!ok) report(ctx, `collection ${c.handle} exists but is ${describeExisting(ex)}, wanted ${describeWanted(c)}; left unchanged (fix by hand)`)
        else report(ctx, `collection ${c.handle} already exists, report only, not modified`)
        st.unchanged++
      }
      // In a dry run nothing is actually created, so treat "doesn't exist yet" as "this run
      // would make it" for the preview messages below (apply mode only trusts real creation).
      const scriptMade = createdThisRun || scriptCreated.has(c.handle) || (!ctx.apply && !ex)
      if (c.manual && scriptMade) {
        const want = ctx.local.items.filter((i) => i.newIn).map((i) => shop.get(i.handle)?.id).filter(Boolean)
        const have = new Set((ex?.products.nodes ?? []).map((n) => n.id))
        const add = want.filter((x) => !have.has(x))
        if (add.length) await act(ctx, st, `${c.handle}: add ${add.length} product(s) [additive, script-created collection]`, async () => {
          if (!id) return
          return ctx.api.mutate(`mutation($id:ID!,$p:[ID!]!){collectionAddProducts(id:$id,productIds:$p){collection{id} userErrors{field message}}}`, { id, p: add }, "collectionAddProducts")
        }, "updated",
          { step: "collections", op: "collectionAddProducts", target: c.handle, before: { productIds: [...have] },
            after: () => ({ after: { addedProductIds: add }, undo: { mutation: null, note: "covered by deleting the collection (collectionCreate undo above); recorded here for the audit trail" } }) })
      } else if (c.manual && !scriptMade) {
        report(ctx, `${c.handle}: pre-existing manual collection, not adding products (only done for collections this script created)`)
      }
      const canPublish = ctx.goLive || ctx.publishNewCollections
      if (online && !ex?.publishedOnPublication) {
        if (!scriptMade) report(ctx, `${c.handle}: not published, pre-existing collection, this script never publishes those`)
        else if (!canPublish) report(ctx, `${c.handle}: would publish with --publish-new-collections or --go-live (script-created collection)`)
        else await act(ctx, st, `publish "${c.handle}" to Online Store [script-created]`, async () => {
          if (!id) return
          return ctx.api.mutate(`mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{field message}}}`, { id, i: [{ publicationId: online.id }] }, "publishablePublish")
        }, "updated",
          { step: "collections", op: "publishablePublish", target: c.handle, before: { published: false },
            after: () => ({ after: { published: true }, undo: { mutation: "publishableUnpublish", variables: { id, input: [{ publicationId: online.id }] } } }) })
      }
    }
    return st
  },
}

// ---------------------------------------------------------------------- menus
const norm = (u) => (u ?? "").replace(/^https?:\/\/[^/]+/i, "").replace(/\/$/, "") || "/"
const menus = {
  // Create-only: an existing handle is reported, never updated. menuUpdate is never called.
  // The store's own "main-menu" handle is never read for writing or modified (we use
  // "khuwabb-main" instead, defined in lib/data.mjs).
  plan: () => MENUS.map((m) => `[additive] create menu ${m.handle} "${m.title}" if its handle doesn't exist → ${m.items.map(([t, u]) => `${t} (${u})`).join(", ")} [create-only: if it exists, report differences and do nothing; untested: HTTP/FRONTPAGE item shapes on 2026-10]`),
  async run(ctx) {
    const st = newStat()
    const existing = await ctx.api.all(async (after) => (await ctx.api.gql(`query($after:String){menus(first:50,after:$after){nodes{id handle title items{title url}} pageInfo{hasNextPage endCursor}}}`, { after })).menus)
    for (const m of MENUS) {
      const items = m.items.map(([title, url]) => url === "/" ? { title, type: "FRONTPAGE" } : { title, type: "HTTP", url })
      const ex = existing.find((e) => e.handle === m.handle)
      if (!ex) {
        await act(ctx, st, `create menu ${m.handle}`, () => ctx.api.mutate(`mutation($t:String!,$h:String!,$i:[MenuItemCreateInput!]!){menuCreate(title:$t,handle:$h,items:$i){menu{id} userErrors{field message}}}`, { t: m.title, h: m.handle, i: items }, "menuCreate"), "created",
          { step: "menus", op: "menuCreate", target: m.handle, before: null,
            after: (p) => ({ after: { id: p.menu.id }, createdIds: [p.menu.id], undo: { mutation: "menuDelete", variables: { id: p.menu.id } } }) })
        continue
      }
      const same = ex.items.length === m.items.length && m.items.every(([t, u], i) => ex.items[i].title === t && norm(ex.items[i].url) === norm(u))
      if (same) { st.unchanged++; continue }
      report(ctx, `menu ${m.handle} exists with different items (${ex.items.map((i) => i.title).join(", ") || "empty"} vs desired ${m.items.map((i) => i[0]).join(", ")}), not modified (create-only; menuUpdate is never called)`)
      st.unchanged++
    }
    return st
  },
}

// ---------------------------------------------------------------------- pages
const pages = {
  // Create-only: an existing handle is reported, never updated. pageUpdate is never called.
  // Pages are created published with an empty body; the theme's page.<templateSuffix>.json
  // template renders all the content. Needs read_content / write_content.
  plan: () => PAGES.map((p) => `[additive] create page ${p.handle} "${p.title}" (template suffix ${p.templateSuffix}, published, empty body) if its handle doesn't exist [create-only: if it exists, report differences and do nothing]`),
  async run(ctx) {
    const st = newStat()
    const existing = await ctx.api.all(async (after) => (await ctx.api.gql(`query($after:String){pages(first:250,after:$after){nodes{id handle title templateSuffix isPublished} pageInfo{hasNextPage endCursor}}}`, { after })).pages)
    for (const p of PAGES) {
      const ex = existing.find((e) => e.handle === p.handle)
      if (!ex) {
        await act(ctx, st, `create page ${p.handle}`, () => ctx.api.mutate(`mutation($page:PageCreateInput!){pageCreate(page:$page){page{id} userErrors{field message}}}`, { page: { title: p.title, handle: p.handle, templateSuffix: p.templateSuffix, isPublished: true, body: "" } }, "pageCreate"), "created",
          { step: "pages", op: "pageCreate", target: p.handle, before: null,
            after: (r) => ({ after: { id: r.page.id }, createdIds: [r.page.id], undo: { mutation: "pageDelete", variables: { id: r.page.id } } }) })
        continue
      }
      if ((ex.templateSuffix ?? "") === p.templateSuffix && ex.title === p.title) { st.unchanged++; continue }
      report(ctx, `page ${p.handle} exists with template suffix "${ex.templateSuffix ?? ""}" and title "${ex.title}" (desired suffix "${p.templateSuffix}", title "${p.title}"${ex.isPublished ? "" : "; also unpublished"}), not modified (create-only; pageUpdate is never called)`)
      st.unchanged++
    }
    return st
  },
}

// ------------------------------------------------------------------ redirects
const redirects = {
  // Only matters once the new pages exist → go-live only. Existing path with a different
  // target is reported, never updated; urlRedirectUpdate is never called.
  plan: () => REDIRECTS.map(([a, b]) => `[go-live] urlRedirectCreate ${a} → ${b} if path has no redirect yet (default mode only reports) [report-only if ${a} already redirects somewhere else]`),
  async run(ctx) {
    const st = newStat()
    const ex = await ctx.api.all(async (after) => (await ctx.api.gql(`query($after:String){urlRedirects(first:250,after:$after){nodes{id path target} pageInfo{hasNextPage endCursor}}}`, { after })).urlRedirects)
    for (const [path, target] of REDIRECTS) {
      const e = ex.find((r) => r.path === path)
      if (!e) {
        if (!ctx.goLive) { report(ctx, `${path} → ${target}: would create with --go-live`); st.unchanged++; continue }
        await act(ctx, st, `redirect ${path} → ${target}`, () => ctx.api.mutate(`mutation($r:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$r){urlRedirect{id} userErrors{field message}}}`, { r: { path, target } }, "urlRedirectCreate"), "created",
          { step: "redirects", op: "urlRedirectCreate", target: path, before: null,
            after: (p) => ({ after: { id: p.urlRedirect.id, target }, createdIds: [p.urlRedirect.id], undo: { mutation: "urlRedirectDelete", variables: { id: p.urlRedirect.id } } }) })
      } else if (norm(e.target) !== norm(target)) {
        report(ctx, `${path} already redirects to "${e.target}" (desired "${target}"), report only, never updated`)
        st.unchanged++
      } else st.unchanged++
    }
    return st
  },
}

// ---------------------------------------------------------------------- files
const files = {
  optional: true,
  plan: () => FILES.map(([p, n]) => `[additive] fileCreate ${p} as "${n}" if not already present (stagedUploadsCreate + fileCreate)`),
  async run(ctx) {
    const st = newStat()
    for (const [path, filename] of FILES) {
      const d = await ctx.api.gql(`query($q:String!){files(first:10,query:$q){nodes{id ... on MediaImage{image{url}}}}}`, { q: `filename:${filename.replace(/\.[^.]+$/, "")}*` })
      const base = filename.replace(/\.[^.]+$/, "")
      const found = d.files.nodes.some((n) => new RegExp(`/${base}(_[0-9a-f-]+)?\\.`, "i").test(n.image?.url ?? ""))
      if (found) { st.unchanged++; continue }
      await act(ctx, st, `upload file ${filename}`, async () => {
        const [url] = await uploadStaged(ctx, [{ path, filename }])
        return ctx.api.mutate(`mutation($f:[FileCreateInput!]!){fileCreate(files:$f){files{id} userErrors{field message}}}`, { f: [{ originalSource: url, filename, contentType: "IMAGE", alt: filename.replace(/\.[^.]+$/, "").replace(/-/g, " ") }] }, "fileCreate")
      }, "created",
        { step: "files", op: "fileCreate", target: filename, before: null,
          after: (p) => ({ after: { id: p.files[0].id }, createdIds: [p.files[0].id], undo: { mutation: "fileDelete", variables: { fileIds: [p.files[0].id] } } }) })
    }
    return st
  },
}

export const STEPS = { definitions, products, media, collections, menus, pages, redirects, files }
export const DEFAULT_STEPS = ["definitions", "products", "media", "collections", "menus", "pages", "redirects"]
export { EMAIL }

#!/usr/bin/env node
// Replay an undo log (tools/store-setup/out/undo-<store>-<ts>.jsonl) in reverse order.
// Dry-run (default) prints each undo that would run. --apply actually calls the mutations,
// using the denylist allow option (these are exactly the denylisted ops: menuDelete,
// pageDelete, collectionDelete, publishableUnpublish, urlRedirectDelete, fileDelete,
// productVariantDetachMedia, metafieldsDelete, productUpdate restoring old values, etc).
import { parseArgs } from "node:util"
import { makeClient, checkStore } from "./lib/api.mjs"
import { readUndoLog } from "./lib/undo-log.mjs"

const { values: f } = parseArgs({ options: {
  log: { type: "string" }, "dry-run": { type: "boolean" }, apply: { type: "boolean" }, "store-check": { type: "string" }, verbose: { type: "boolean" }, help: { type: "boolean" },
} })
if (f.help || !f.log) {
  console.log("node tools/store-setup/undo.mjs --log <undo-*.jsonl> [--dry-run|--apply] --store-check <handle>")
  process.exit(f.help ? 0 : 2)
}
if (f.apply && f["dry-run"]) { console.error("Choose only one of --dry-run, --apply"); process.exit(2) }
const apply = !!f.apply // dry-run is the default
if (!f["store-check"]) { console.error("--store-check <handle> is required"); process.exit(2) }

const entries = readUndoLog(f.log)
console.log(`Loaded ${entries.length} line(s) from ${f.log}`)

// Pair each "pending" with the done/failed that closes it out. Primary match is by `id`
// (written on both lines by lib/undo-log.mjs); for older logs without ids, fall back to
// matching step+op+target against the next unconsumed done/failed in log order. A pending
// with no match at all is orphaned: the process likely died mid-mutation.
const byId = new Map()
for (const e of entries) if ((e.status === "done" || e.status === "failed") && e.id != null) byId.set(e.id, e)
const consumedIdx = new Set()
function fallbackMatch(pendingEntry, fromIdx) {
  for (let i = fromIdx + 1; i < entries.length; i++) {
    if (consumedIdx.has(i)) continue
    const e = entries[i]
    if ((e.status === "done" || e.status === "failed") && e.step === pendingEntry.step && e.op === pendingEntry.op && e.target === pendingEntry.target) {
      consumedIdx.add(i)
      return e
    }
  }
  return null
}
const orphanedPending = []
entries.forEach((e, idx) => {
  if (e.status !== "pending") return
  if (e.id != null && byId.has(e.id)) return
  if (e.id == null && fallbackMatch(e, idx)) return
  orphanedPending.push(e)
})

const failed = entries.filter((e) => e.status === "failed")
if (orphanedPending.length) { console.log(`\n!! ${orphanedPending.length} ORPHANED PENDING entr${orphanedPending.length === 1 ? "y" : "ies"} (no matching done/failed, mutation may have half-applied; check by hand):`); for (const e of orphanedPending) console.log(`   ${e.ts} ${e.step}.${e.op} target=${e.target}`) }
if (failed.length) { console.log(`\n!! ${failed.length} FAILED entr${failed.length === 1 ? "y" : "ies"} (never succeeded, nothing to undo):`); for (const e of failed) console.log(`   ${e.ts} ${e.step}.${e.op} target=${e.target}: ${e.message}`) }

// undo can be a single {mutation,variables} (most steps) or a list of them, oldest-first
// (products: metafieldsDelete per unset key, then productUpdate restoring productType), run
// in REVERSE within the entry too.
const hasUndo = (u) => (Array.isArray(u) ? u.some((x) => x?.mutation) : !!u?.mutation)
const undoOpsReversed = (u) => (Array.isArray(u) ? [...u].reverse() : [u]).filter((x) => x?.mutation)

const done = entries.filter((e) => e.status === "done" && hasUndo(e.undo)).reverse()
console.log(`\n${done.length} "done" entr${done.length === 1 ? "y" : "ies"} with an undo, in reverse order (${apply ? "APPLY" : "DRY-RUN, nothing will be written"}):`)
if (!done.length) process.exit(0)

const store = process.env.SHOPIFY_STORE || "citbkj-yj.myshopify.com"
const token = process.env.SHOPIFY_ADMIN_TOKEN
if (apply && !token) { console.error("SHOPIFY_ADMIN_TOKEN is required for --apply"); process.exit(2) }

if (apply) {
  const api = makeClient({ store, token, verbose: f.verbose })
  await checkStore(api, f["store-check"])
  let errors = 0
  for (const e of done) {
    for (const { mutation, variables } of undoOpsReversed(e.undo)) {
      console.log(`  [undo] ${e.step}.${e.op} target=${e.target} → ${mutation}`)
      try {
        // allow:true: undo.mjs is the one place permitted to call denylisted mutations.
        await api.mutate(undoQueryFor(mutation), variables, mutation, { allow: true })
        console.log(`  [done]  ${mutation}`)
      } catch (err) { errors++; console.log(`  [ERROR] ${mutation} for ${e.step}.${e.op} target=${e.target}: ${err.message}`) }
    }
  }
  if (errors) { console.log(`\n${errors} undo operation(s) failed.`); process.exit(1) }
} else {
  for (const e of done) for (const { mutation, variables } of undoOpsReversed(e.undo)) console.log(`  [would undo] ${e.step}.${e.op} target=${e.target} → ${mutation}(${JSON.stringify(variables)})`)
}

// Minimal mutation bodies for the undo ops this log can contain. Kept generic (just the
// userErrors shape we already rely on elsewhere) since undo.mjs is the one place allowed to
// call denylisted mutations.
function undoQueryFor(mutation) {
  const bodies = {
    metafieldDefinitionDelete: `mutation($id:ID!,$deleteAllAssociatedMetafields:Boolean!){metafieldDefinitionDelete(id:$id,deleteAllAssociatedMetafields:$deleteAllAssociatedMetafields){deletedDefinitionId userErrors{field message}}}`,
    metafieldDefinitionUpdate: `mutation($d:MetafieldDefinitionUpdateInput!){metafieldDefinitionUpdate(definition:$d){updatedDefinition{id} userErrors{field message}}}`,
    metafieldDefinitionUnpin: `mutation($identifier:MetafieldDefinitionIdentifierInput!){metafieldDefinitionUnpin(identifier:$identifier){pinnedDefinition{id} userErrors{field message}}}`,
    productUpdate: `mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id} userErrors{field message}}}`,
    metafieldsDelete: `mutation($metafields:[MetafieldIdentifierInput!]!){metafieldsDelete(metafields:$metafields){deletedMetafields{key} userErrors{field message}}}`,
    fileDelete: `mutation($fileIds:[ID!]!){fileDelete(fileIds:$fileIds){deletedFileIds userErrors{field message}}}`,
    productDeleteMedia: `mutation($productId:ID!,$mediaIds:[ID!]!){productDeleteMedia(productId:$productId,mediaIds:$mediaIds){deletedMediaIds userErrors{field message}}}`,
    productVariantDetachMedia: `mutation($productId:ID!,$variantMedia:[ProductVariantDetachMediaInput!]!){productVariantDetachMedia(productId:$productId,variantMedia:$variantMedia){userErrors{field message}}}`,
    collectionDelete: `mutation($input:CollectionDeleteInput!){collectionDelete(input:$input){deletedCollectionId userErrors{field message}}}`,
    publishableUnpublish: `mutation($id:ID!,$input:[PublicationInput!]!){publishableUnpublish(id:$id,input:$input){userErrors{field message}}}`,
    menuDelete: `mutation($id:ID!){menuDelete(id:$id){deletedMenuId userErrors{field message}}}`,
    pageDelete: `mutation($id:ID!){pageDelete(id:$id){deletedPageId userErrors{field message}}}`,
    urlRedirectDelete: `mutation($id:ID!){urlRedirectDelete(id:$id){deletedUrlRedirectId userErrors{field message}}}`,
    tagsRemove: `mutation($id:ID!,$tags:[String!]!){tagsRemove(id:$id,tags:$tags){node{id} userErrors{field message}}}`,
  }
  const q = bodies[mutation]
  if (!q) throw new Error(`no undo mutation body known for "${mutation}"`)
  return q
}

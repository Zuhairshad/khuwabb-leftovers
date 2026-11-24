// --backup: read-only snapshot of the store into tools/store-setup/out/backups/<store>-<ISO>/.
// Nothing here writes to Shopify. Paginates everything via ctx.api.all.
import { writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { ROOT, SHOPIFY_API_VERSION } from "./data.mjs"

export const BACKUPS_DIR = resolve(ROOT, "tools/store-setup/out/backups")

// Is there a backup dir for this store newer than 24h? --apply refuses to run without one
// (override: --no-backup-check).
export function hasRecentBackup(store, maxAgeMs = 24 * 60 * 60 * 1000) {
  if (!existsSync(BACKUPS_DIR)) return false
  const now = Date.now()
  return readdirSync(BACKUPS_DIR).some((name) => {
    if (!name.startsWith(`${store}-`)) return false
    const dir = resolve(BACKUPS_DIR, name)
    try { return statSync(dir).isDirectory() && now - statSync(dir).mtimeMs < maxAgeMs } catch { return false }
  })
}

const PUBLICATIONS_Q = `query{publications(first:20){nodes{id name}}}`
// publications{nodes{name}} is the 2026-10 shape as remembered; if "name" errors in practice,
// fall back to catalog{title} or app{title} matching (see README "known API-shape risks").
async function onlineStorePublicationId(api) {
  try {
    const nodes = (await api.gql(PUBLICATIONS_Q)).publications.nodes
    return nodes.find((p) => p.name === "Online Store")?.id ?? null
  } catch (e) {
    throw new Error(`reading publications failed before any write (read-only backup step): ${e.message}`)
  }
}

async function backupProducts(api) {
  const nodes = await api.all(async (after) => (await api.gql(
    `query($after:String){products(first:50,after:$after){nodes{
      id handle title productType descriptionHtml status tags
      metafields(first:100){nodes{namespace key value type}}
      media(first:60){nodes{id alt mediaContentType status ... on MediaImage{image{url}}}}
      variants(first:100){nodes{id title selectedOptions{name value} media(first:5){nodes{id}}}}
    } pageInfo{hasNextPage endCursor}}}`, { after })).products)
  return nodes
}

async function backupCollections(api, pubId) {
  const nodes = await api.all(async (after) => (await api.gql(
    `query($after:String,$pub:[ID!]){collections(first:50,after:$after){nodes{
      id handle title ruleSet{appliedDisjunctively rules{column relation condition}}
      products(first:250){nodes{id}}
      resourcePublicationsV2(first:10){nodes{publication{id}}}
    } pageInfo{hasNextPage endCursor}}}`, { after })).collections)
  return nodes.map((n) => ({ ...n, publishedOnOnlineStore: pubId ? n.resourcePublicationsV2.nodes.some((p) => p.publication.id === pubId) : null }))
}

async function backupMenus(api) {
  return api.all(async (after) => (await api.gql(
    `query($after:String){menus(first:50,after:$after){nodes{id handle title items{title type url resourceId items{title type url resourceId}}} pageInfo{hasNextPage endCursor}}}`, { after })).menus)
}

async function backupPages(api) {
  return api.all(async (after) => (await api.gql(
    `query($after:String){pages(first:250,after:$after){nodes{id handle title templateSuffix isPublished body} pageInfo{hasNextPage endCursor}}}`, { after })).pages)
}

async function backupRedirects(api) {
  return api.all(async (after) => (await api.gql(
    `query($after:String){urlRedirects(first:250,after:$after){nodes{id path target} pageInfo{hasNextPage endCursor}}}`, { after })).urlRedirects)
}

async function backupDefinitions(api) {
  const ownerTypes = ["PRODUCT", "COLLECTION", "ORDER", "CUSTOMER", "VARIANT", "SHOP"]
  const out = []
  for (const ownerType of ownerTypes) {
    try {
      const nodes = await api.all(async (after) => (await api.gql(
        `query($after:String,$o:MetafieldOwnerType!){metafieldDefinitions(ownerType:$o,first:100,after:$after){nodes{id namespace key name type{name} ownerType pinnedPosition access{storefront}} pageInfo{hasNextPage endCursor}}}`,
        { after, o: ownerType })).metafieldDefinitions)
      out.push(...nodes)
    } catch (e) { out.push({ ownerType, error: e.message }) }
  }
  return out
}

async function backupFiles(api) {
  return api.all(async (after) => (await api.gql(
    `query($after:String){files(first:50,after:$after){nodes{id alt createdAt ... on MediaImage{image{url}} ... on GenericFile{url originalFileSize} ... on Video{sources{url}}} pageInfo{hasNextPage endCursor}}}`, { after })).files)
}

async function backupShop(api) {
  return (await api.gql(`query{shop{id name myshopifyDomain primaryDomain{url}}}`)).shop
}

export async function runBackup(ctx, store) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const dir = resolve(BACKUPS_DIR, `${store}-${ts}`)
  mkdirSync(dir, { recursive: true })
  console.log(`Backing up ${store} → ${dir}`)

  const pubId = await onlineStorePublicationId(ctx.api)
  const sections = [
    ["shop.json", backupShop(ctx.api)],
    ["products.json", backupProducts(ctx.api)],
    ["collections.json", backupCollections(ctx.api, pubId)],
    ["menus.json", backupMenus(ctx.api)],
    ["pages.json", backupPages(ctx.api)],
    ["redirects.json", backupRedirects(ctx.api)],
    ["metafield-definitions.json", backupDefinitions(ctx.api)],
    ["files.json", backupFiles(ctx.api)],
  ]
  const counts = {}
  for (const [name, p] of sections) {
    const data = await p
    writeFileSync(resolve(dir, name), JSON.stringify(data, null, 2))
    counts[name] = Array.isArray(data) ? data.length : 1
    console.log(`  wrote ${name} (${counts[name]})`)
  }
  const manifest = { store, timestamp: ts, apiVersion: SHOPIFY_API_VERSION, counts }
  writeFileSync(resolve(dir, "manifest.json"), JSON.stringify(manifest, null, 2))

  console.log(`\nBackup summary: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ")}`)
  console.log("This backup covers Admin API objects only. Also, by hand, before go-live:")
  console.log("  - Admin → Products → Export → export Products CSV")
  console.log("  - Admin → Settings → Apps and sales channels → ... → export URL redirects CSV (Navigation → URL Redirects → Export)")
  console.log("  - Download the live theme (khuwabb-theme-v2.6) as a .zip (Online Store → Themes → ... → Download theme file)")
  return { dir, manifest }
}

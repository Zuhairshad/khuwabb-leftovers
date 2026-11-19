// Pulls the live catalog from Shopify (Storefront API, no token) into
// data/shopify.json: per product handle — title, price, colour/size options
// in Shopify's order, and every variant's ID, options and availability.
//
//   node scripts/sync-shopify.mjs
//
// Runs before every build (npm run build), so each deploy carries current
// prices and stock. If Shopify can't be reached the last synced file is kept
// and the build continues (it says so loudly).
import { readFileSync, writeFileSync } from "node:fs"
import { SHOPIFY_API_VERSION, STOREFRONT_URL } from "../lib/shopify-config.mjs"

const QUERY = `query Catalog($after: String) {
  products(first: 100, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      handle title availableForSale
      options { name optionValues { name } }
      variants(first: 100) {
        nodes { id availableForSale price { amount currencyCode } compareAtPrice { amount } selectedOptions { name value } }
      }
    }
  }
}`

async function fetchAll() {
  const products = []
  let after = null
  do {
    const res = await fetch(STOREFRONT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { after } }),
    })
    const served = res.headers.get("x-shopify-api-version")
    if (served && served !== SHOPIFY_API_VERSION) throw new Error(`Shopify served API ${served}, expected ${SHOPIFY_API_VERSION} — update SHOPIFY_API_VERSION`)
    const json = await res.json()
    if (!res.ok || json.errors) throw new Error(`Shopify ${res.status}: ${JSON.stringify(json.errors ?? json)}`)
    const page = json.data.products
    products.push(...page.nodes)
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null
  } while (after)
  return products
}

try {
  const products = await fetchAll()
  const out = {}
  for (const p of products) {
    const opt = (name) => p.options.find((o) => o.name === name)?.optionValues.map((v) => v.name) ?? []
    out[p.handle] = {
      title: p.title,
      colours: opt("Color"),
      sizes: opt("Size"),
      variants: p.variants.nodes.map((v) => ({
        id: v.id.split("/").pop(),
        colour: v.selectedOptions.find((o) => o.name === "Color")?.value ?? "",
        size: v.selectedOptions.find((o) => o.name === "Size")?.value ?? "",
        price: Number(v.price.amount),
        compareAt: v.compareAtPrice ? Number(v.compareAtPrice.amount) : null,
        available: v.availableForSale,
      })),
    }
  }
  writeFileSync("data/shopify.json", JSON.stringify({ syncedAt: new Date().toISOString(), apiVersion: SHOPIFY_API_VERSION, products: out }, null, 1) + "\n")
  const n = Object.values(out).reduce((s, p) => s + p.variants.length, 0)
  console.log(`Shopify: ${Object.keys(out).length} products, ${n} variants synced`)
} catch (e) {
  let last = "never"
  try {
    last = JSON.parse(readFileSync("data/shopify.json", "utf8")).syncedAt
  } catch {}
  console.warn(`\n⚠ Shopify sync failed (${e.message}). Using the last synced catalog (${last}).\n`)
}

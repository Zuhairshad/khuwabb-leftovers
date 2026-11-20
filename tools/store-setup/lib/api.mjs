// Minimal Admin GraphQL client: throttling-aware, retries, userErrors → exceptions.
import { SHOPIFY_API_VERSION } from "./data.mjs"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export class UserErrors extends Error {
  constructor(where, errors) {
    super(`${where}: ${errors.map((e) => `${(e.field ?? []).join(".")} ${e.message}`.trim()).join("; ")}`)
    this.errors = errors
  }
}

// Mutations that change or remove existing/customer-visible data. setup.mjs never calls these
// directly (the per-step rewrite avoided every one); only undo.mjs may, passing allow:true.
export const DENYLIST = new Set([
  "menuUpdate", "menuDelete", "urlRedirectUpdate", "urlRedirectDelete", "productDelete", "collectionDelete",
  "productVariantDetachMedia", "metafieldsDelete", "fileDelete", "productDeleteMedia", "collectionUpdate",
  "publishableUnpublish",
])

export class DenylistedMutation extends Error {
  constructor(field) { super(`mutation "${field}" is denylisted (changes/removes existing or customer-visible data); only undo.mjs may call it (allow:true)`) }
}

// Query shop{name myshopifyDomain}; abort the whole process (exit 2, nothing written) unless
// myshopifyDomain starts with "<handle>.". Always prints shop name + domain.
export async function checkStore(api, handle) {
  const d = await api.gql(`query{shop{name myshopifyDomain}}`)
  const { name, myshopifyDomain } = d.shop
  console.log(`Shop: ${name} (${myshopifyDomain})`)
  if (handle && !myshopifyDomain.startsWith(`${handle}.`)) {
    console.error(`ABORT: --store-check ${handle} does not match store domain ${myshopifyDomain}. Nothing written.`)
    process.exit(2)
  }
  return d.shop
}

export function makeClient({ store, token, verbose }) {
  const url = `https://${store}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`
  let available = null, restoreRate = 50
  async function gql(query, variables = {}) {
    for (let attempt = 0; ; attempt++) {
      let res, body
      try {
        res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token }, body: JSON.stringify({ query, variables }) })
        if (res.status === 429 || res.status >= 500) throw Object.assign(new Error(`HTTP ${res.status}`), { retry: true })
        if (res.status === 401 || res.status === 403) throw new Error(`HTTP ${res.status}: check SHOPIFY_ADMIN_TOKEN and its access scopes`)
        body = await res.json()
      } catch (e) {
        if ((e.retry || e.name === "TypeError") && attempt < 6) { await sleep(Math.min(30000, 1000 * 2 ** attempt)); continue }
        throw e
      }
      const throttled = body.errors?.some((e) => e.extensions?.code === "THROTTLED")
      const ts = body.extensions?.cost?.throttleStatus
      if (ts) { available = ts.currentlyAvailable; restoreRate = ts.restoreRate || restoreRate }
      if (throttled && attempt < 8) {
        const need = body.extensions?.cost?.requestedQueryCost ?? 500
        const wait = Math.max(1000, ((need - (available ?? 0)) / restoreRate) * 1000 + 250)
        if (verbose) console.log(`  [throttled] waiting ${Math.round(wait)}ms`)
        await sleep(wait); continue
      }
      if (body.errors?.length) throw new Error("GraphQL: " + body.errors.map((e) => e.message).join("; "))
      const cost = body.extensions?.cost
      if (cost && available != null && cost.requestedQueryCost > available) await sleep(((cost.requestedQueryCost - available) / restoreRate) * 1000)
      if (verbose) console.log(`  [gql] cost ${cost?.actualQueryCost ?? "?"} left ${available ?? "?"}`)
      return body.data
    }
  }
  // Run a mutation whose payload has userErrors; return payload.
  // opts.allow:true is required to call a DENYLIST mutation (undo.mjs only).
  async function mutate(query, variables, field, opts = {}) {
    if (DENYLIST.has(field) && !opts.allow) throw new DenylistedMutation(field)
    const data = await gql(query, variables)
    const p = data[field]
    if (p?.userErrors?.length) throw new UserErrors(field, p.userErrors)
    return p
  }
  // Paginate a top-level connection: pageFn(after) -> connection {nodes,pageInfo}
  async function all(queryFn) {
    const out = []
    let after = null
    for (;;) {
      const c = await queryFn(after)
      out.push(...c.nodes)
      if (!c.pageInfo.hasNextPage) return out
      after = c.pageInfo.endCursor
    }
  }
  return { gql, mutate, all }
}

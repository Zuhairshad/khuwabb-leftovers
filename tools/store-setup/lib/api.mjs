// Minimal Admin GraphQL client: throttling-aware, retries, userErrors → exceptions.
import { SHOPIFY_API_VERSION } from "./data.mjs"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export class UserErrors extends Error {
  constructor(where, errors) {
    super(`${where}: ${errors.map((e) => `${(e.field ?? []).join(".")} ${e.message}`.trim()).join("; ")}`)
    this.errors = errors
  }
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
  async function mutate(query, variables, field) {
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

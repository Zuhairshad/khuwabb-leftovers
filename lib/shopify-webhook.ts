import { timingSafeEqual, createHmac } from "node:crypto"

// Pure, testable pieces of the Shopify webhook handler
// (app/api/shopify-webhook/route.ts). Kept out of route.ts because a route
// file may only export HTTP methods and the handful of route config fields.

const TOPICS = new Set(["products/create", "products/update", "products/delete", "inventory_levels/update"])

/** Shopify signs the raw body with the webhook's signing key (HMAC-SHA256, base64). */
export function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64")
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** Only these topics mean the catalog snapshot is stale. */
export function shouldAct(topic: string | null): boolean {
  return !!topic && TOPICS.has(topic)
}

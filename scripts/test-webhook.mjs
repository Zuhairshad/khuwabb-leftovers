// Sends a signed (or deliberately mis-signed) sample Shopify webhook to a
// running app/api/shopify-webhook endpoint, for manual testing.
//
//   SHOPIFY_WEBHOOK_SECRET=... node scripts/test-webhook.mjs <url> [topic] [--bad-signature]
//
// url    e.g. http://localhost:3100/api/shopify-webhook
// topic  defaults to inventory_levels/update
import { createHmac } from "node:crypto"

const args = process.argv.slice(2).filter((a) => a !== "--bad-signature")
const badSignature = process.argv.includes("--bad-signature")
const url = args[0]
const topic = args[1] ?? "inventory_levels/update"

if (!url) {
  console.error("usage: node scripts/test-webhook.mjs <url> [topic] [--bad-signature]")
  process.exit(1)
}

const secret = process.env.SHOPIFY_WEBHOOK_SECRET
if (!secret) {
  console.error("SHOPIFY_WEBHOOK_SECRET is not set")
  process.exit(1)
}

const body = JSON.stringify({ inventory_item_id: 123456, location_id: 1, available: 4 })
const hmac = badSignature ? "not-a-real-signature==" : createHmac("sha256", secret).update(body, "utf8").digest("base64")

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-shopify-topic": topic,
    "x-shopify-hmac-sha256": hmac,
  },
  body,
})
const text = await res.text()
console.log(`${res.status} ${res.statusText}`)
console.log(text)

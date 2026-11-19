import type { BagLine } from "./bag"
import { SHOPIFY_STORE_DOMAIN } from "./shopify-config.mjs"

// Checkout is handed to Shopify. The bag becomes a Shopify cart permalink
// (/cart/<variant>:<qty>,…), which opens a fresh Shopify checkout. Shopify
// then owns the order: Cash on Delivery, delivery charges, totals, stock
// checks, the confirmation page and duplicate protection; orders appear in
// Shopify admin › Orders.
//
// NEXT_PUBLIC_CHECKOUT_ENABLED=false switches it off (e.g. during a stock
// take) without touching code.
const ENABLED = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED !== "false"

export type CheckoutState = { ready: true; url: string } | { ready: false; reason: string }

export function checkoutFor(lines: BagLine[]): CheckoutState {
  if (!lines.length) return { ready: false, reason: "Your bag is empty." }
  if (lines.some((l) => !l.orderable || !l.shopifyId)) return { ready: false, reason: "Remove the pieces that are sold out or no longer available." }
  if (!ENABLED) return { ready: false, reason: "Online checkout is paused right now." }
  if (lines.some((l) => !/^\d+$/.test(l.shopifyId!))) return { ready: false, reason: "Online checkout is paused right now." }
  const items = lines.map((l) => `${l.shopifyId}:${l.qty}`).join(",")
  return { ready: true, url: `https://${SHOPIFY_STORE_DOMAIN}/cart/${items}` }
}

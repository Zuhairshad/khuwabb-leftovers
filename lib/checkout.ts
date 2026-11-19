import type { BagLine } from "./bag"

// Checkout is handed to Shopify (Khuwabb's store already runs there, with COD
// set up as a manual payment method in Shopify admin). Shopify then owns the
// order: totals, shipping rates, stock, the confirmation page and duplicate
// protection, and the owner finds every order in Shopify admin › Orders.
//
// Setup only — off until NEXT_PUBLIC_CHECKOUT_ENABLED=true and real variant
// IDs are in data/catalog-overrides.json. See .env.example.
const DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ?? ""
const ENABLED = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === "true"

export type CheckoutState = { ready: true; url: string } | { ready: false; reason: string }

export function checkoutFor(lines: BagLine[]): CheckoutState {
  if (!lines.length) return { ready: false, reason: "Your bag is empty." }
  if (lines.some((l) => !l.orderable || !l.shopifyId)) return { ready: false, reason: "Remove the pieces that can't be ordered yet." }
  if (!ENABLED || !DOMAIN) return { ready: false, reason: "Online checkout opens soon." }
  if (lines.some((l) => !/^\d+$/.test(l.shopifyId!))) return { ready: false, reason: "Online checkout opens soon." }
  // Shopify cart permalink: /cart/<variant>:<qty>,… opens a fresh checkout.
  const items = lines.map((l) => `${l.shopifyId}:${l.qty}`).join(",")
  return { ready: true, url: `https://${DOMAIN}/cart/${items}` }
}

// Shopify connection for the storefront. Public values only - the Storefront
// API is used without a token (products, carts and checkout links are
// available to tokenless requests), so nothing here is secret.
//
// The API version lives in code on purpose: Shopify serves the oldest
// supported version when asked for an expired one, so a stale env var would
// silently downgrade. Bump it here when Shopify retires it.
export const SHOPIFY_STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "citbkj-yj.myshopify.com"
export const SHOPIFY_API_VERSION = "2026-10"
export const STOREFRONT_URL = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`

// Site product slug → Shopify product handle, where they differ.
export const SHOPIFY_HANDLES = {
  "boat-neck-long-sleeve-maxi-dress": "womens-boat-neck-long-sleeve-maxi-dress",
  "ladies-vinyl-jacket": "womens-high-shine-vinyl-puffer-jacket",
}

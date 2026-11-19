import data from "@/data/products.json"
import shopify from "@/data/shopify.json"
import { SHOPIFY_HANDLES } from "./shopify-config.mjs"

// The one product source for Home, Shop, New In, product pages and the bag.
// Built by scripts/build-khuwabb-data.mjs; nothing here invents data.

export type Variant = { shopifyId: string | null; available: boolean | null }
export type View = "front" | "side" | "back"
export type Colour = { name: string; image: string | null; views: Partial<Record<View, string>>; ratio: number | null }
export type Product = {
  id: string
  slug: string
  name: string
  category: string
  soldAs: "set" | "single"
  price: number | null
  compareAt: number | null
  sizes: string[]
  colours: Colour[]
  variants: Record<string, Variant>
  details: { description: string | null; fabric: string | null; care: string | null; sizeChart: string | null }
  tint: string
  newIn: boolean
  sourceUrl: string | null
}

// Test fixture: lets the local test run exercise the bag with every variant
// orderable. Never honoured in a production build.
const FIXTURE = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_CATALOG_FIXTURE === "orderable"

type ShopifyProduct = {
  title: string
  colours: string[]
  sizes: string[]
  variants: { id: string; colour: string; size: string; price: number; compareAt: number | null; available: boolean }[]
}
const SHOPIFY = (shopify as unknown as { products: Record<string, ShopifyProduct> }).products

/** Shopify's handle for a site product. */
export const shopifyHandle = (slug: string) => (SHOPIFY_HANDLES as Record<string, string>)[slug] ?? slug

// Shopify owns name, price, colours, sizes, variant IDs and stock
// (data/shopify.json, synced before each build). The site keeps its photos,
// backgrounds and copy. A colour Shopify has but the site has no photo for is
// left out; a product missing from Shopify can't be ordered.
function withShopify(p: Product): Product {
  const s = SHOPIFY[shopifyHandle(p.slug)]
  if (!s) return { ...p, variants: Object.fromEntries(Object.keys(p.variants).map((k) => [k, { shopifyId: null, available: null }])) }
  const colours = s.colours.flatMap((name) => p.colours.filter((c) => c.name === name))
  const variants: Record<string, Variant> = {}
  for (const v of s.variants) variants[`${v.colour} / ${v.size}`] = { shopifyId: v.id, available: v.available }
  const prices = s.variants.map((v) => v.price)
  return { ...p, name: s.title, price: prices.length ? Math.min(...prices) : null, compareAt: null, sizes: s.sizes, colours, variants }
}

export const products: Product[] = (data as unknown as Product[]).map(withShopify).map((p) =>
  FIXTURE
    ? {
        ...p,
        variants: Object.fromEntries(
          Object.keys(p.variants).map((k) => [k, { shopifyId: `test-${p.slug}-${k.replace(/\W+/g, "-").toLowerCase()}`, available: true }]),
        ),
      }
    : p,
)

const bySlug = new Map(products.map((p) => [p.slug, p]))
export const getProduct = (slug: string | null | undefined) => (slug ? bySlug.get(slug) : undefined)

export const variantKey = (colour: string, size: string) => `${colour} / ${size}`

/** A variant can be ordered only with a confirmed price, Shopify variant and stock. */
export function canOrder(p: Product | undefined, colour: string, size: string) {
  if (!p || typeof p.price !== "number") return false
  const v = p.variants[variantKey(colour, size)]
  return !!v?.shopifyId && v.available === true
}

export const anyOrderable = (p: Product) =>
  typeof p.price === "number" && Object.values(p.variants).some((v) => !!v.shopifyId && v.available === true)

/** The front photo for a colour (or the first photographed colour). */
export function photo(p: Product, colour?: string) {
  const c = (colour && p.colours.find((x) => x.name === colour && x.image)) || p.colours.find((x) => x.image)
  return { src: c?.image ?? "", ratio: c?.ratio ?? 0.8, views: c?.views ?? {} }
}

export const productHref = (p: Product) => `/products/${p.slug}`
export const colourList = (p: Product) => p.colours.map((c) => c.name).join(" · ")

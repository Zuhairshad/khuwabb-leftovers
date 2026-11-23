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

type ShopifyImage = { url: string; altText: string | null; width: number | null; height: number | null }
type ShopifyProduct = {
  title: string
  colours: string[]
  sizes: string[]
  description?: string | null
  productType?: string | null
  tags?: string[]
  createdAt?: string
  featuredImage?: ShopifyImage | null
  images?: (ShopifyImage | null)[]
  variants: {
    id: string
    colour: string
    size: string
    price: number
    compareAt: number | null
    available: boolean
    image?: ShopifyImage | null
  }[]
}
const SHOPIFY = (shopify as unknown as { products: Record<string, ShopifyProduct> }).products

/** Shopify's handle for a site product. */
export const shopifyHandle = (slug: string) => (SHOPIFY_HANDLES as Record<string, string>)[slug] ?? slug

// A product that exists in Shopify but has no products.json entry has no
// hand-photographed colours or copy — reuse a pastel already in rotation
// rather than inventing a new one.
const NEUTRAL_TINT = "rgb(213, 229, 190)"
const NEW_IN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

function shopifyPrices(variants: ShopifyProduct["variants"]): Pick<Product, "price" | "compareAt"> {
  const lowest = variants.reduce<ShopifyProduct["variants"][number] | undefined>((current, variant) => {
    if (typeof variant.price !== "number") return current
    return !current || variant.price < current.price ? variant : current
  }, undefined)
  return { price: lowest?.price ?? null, compareAt: lowest?.compareAt ?? null }
}

// Builds a full Product straight from Shopify for a handle products.json
// doesn't cover. Shopify-only products get their photos from the product's
// featured/variant images (no local photography), one "front" view per
// colour. Returns null when there isn't enough to show (no image, or no
// variant with a confirmed price).
function fromShopifyOnly(handle: string, s: ShopifyProduct): Product | null {
  const pricing = shopifyPrices(s.variants)
  if (pricing.price === null) return null

  const imageFor = (colourName: string) =>
    s.variants.find((v) => v.colour === colourName && v.image?.url)?.image ?? s.featuredImage ?? s.images?.find((i) => i?.url) ?? null

  const colourNames = s.colours.length ? s.colours : [""]
  const colours: Colour[] = colourNames
    .map((name) => {
      const img = imageFor(name)
      if (!img?.url) return null
      const ratio = img.width && img.height ? img.width / img.height : null
      return { name: name || s.title, image: img.url, views: { front: img.url }, ratio } as Colour
    })
    .filter((c): c is Colour => !!c)
  if (!colours.length) return null

  const variants: Record<string, Variant> = {}
  for (const v of s.variants) variants[`${v.colour} / ${v.size}`] = { shopifyId: v.id, available: v.available }

  const createdAt = s.createdAt ? Date.parse(s.createdAt) : NaN
  const newIn = !!s.tags?.includes("new-in") || (!Number.isNaN(createdAt) && Date.now() - createdAt < NEW_IN_WINDOW_MS)

  return {
    id: handle,
    slug: handle,
    name: s.title,
    category: s.productType || "New In",
    soldAs: "single",
    ...pricing,
    sizes: s.sizes,
    colours,
    variants,
    details: { description: s.description ?? null, fabric: null, care: null, sizeChart: null },
    tint: NEUTRAL_TINT,
    newIn,
    sourceUrl: null,
  }
}

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
  return { ...p, name: s.title, ...shopifyPrices(s.variants), sizes: s.sizes, colours, variants }
}

// Every handle products.json already maps to a site slug (directly or via
// SHOPIFY_HANDLES) is "covered". Any Shopify handle left over is a product
// that only exists in Shopify, appended with its own Shopify-sourced photos.
const hand = data as unknown as Product[]
const coveredHandles = new Set(hand.map((p) => shopifyHandle(p.slug)))
const shopifyOnly = Object.entries(SHOPIFY)
  .filter(([handle]) => !coveredHandles.has(handle))
  .map(([handle, s]) => fromShopifyOnly(handle, s))
  .filter((p): p is Product => !!p)

export const products: Product[] = [...hand.map(withShopify), ...shopifyOnly].map((p) =>
  FIXTURE
    ? {
        ...p,
        variants: Object.fromEntries(
          Object.keys(p.variants).map((k) => [k, { shopifyId: `test-${p.slug}-${k.replace(/\W+/g, "-").toLowerCase()}`, available: true }]),
        ),
      }
    : p,
)

// Both New Arrivals views use the same Shopify creation dates.
export const newArrivals = products
  .filter((product) => product.newIn)
  .map((product) => ({
    product,
    createdAt: Date.parse(SHOPIFY[shopifyHandle(product.slug)]?.createdAt ?? "") || 0,
  }))
  .sort((a, b) => b.createdAt - a.createdAt)
  .map(({ product }) => product)

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

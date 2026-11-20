// Builds data/products.json — the one catalog every page and the bag read.
//
// Source of truth: the owner's handwritten catalog (WhatsApp photos of the
// notebook, 19 Nov 2026) — names, prices, colours and sizes per product — and
// the supplied photos in Khuwabb_Color_Variants/, cut out by
// scripts/cutout-photos.mjs into public/products/<slug>/<colour>/<view>.webp.
//
// Descriptions are shop copy written from the photos (the owner asked for
// them). Fabric, care, size charts, stock and Shopify variant IDs are not
// confirmed and stay null; fill them in data/catalog-overrides.json.
// A variant can only be ordered once it has a Shopify variant ID and is
// marked available.
import { existsSync, readFileSync, writeFileSync } from "node:fs"

const overrides = existsSync("data/catalog-overrides.json") ? JSON.parse(readFileSync("data/catalog-overrides.json", "utf8")) : {}
const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
const VIEWS = ["front", "side", "back"]

// Pixel size of a WebP (VP8X / VP8 / VP8L), so layouts can use real ratios.
function webpSize(file) {
  const b = readFileSync(file)
  const kind = b.toString("ascii", 12, 16)
  if (kind === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) }
  if (kind === "VP8L") {
    const bits = b.readUInt32LE(21)
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 }
  }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff }
}

// colours: [display name, photo folder]
function colour(slug, [name, folder]) {
  const views = {}
  for (const v of VIEWS) {
    const rel = `/products/${slug}/${folder}/${v}.webp`
    if (existsSync(`public${rel}`)) views[v] = rel
  }
  const size = views.front ? webpSize(`public${views.front}`) : null
  return { name, image: views.front ?? null, views, ratio: size ? +(size.w / size.h).toFixed(4) : null }
}

const UK_4_14 = ["4", "6", "8", "10", "12", "14"]
const UK_4_16 = [...UK_4_14, "16"]
const SML = ["S", "M", "L"]

const P = ({ slug, name, category, price, sizes, colours, tint, onSite = true, description, soldAs }) => {
  const o = overrides[slug] ?? {}
  const cs = colours.map((c) => colour(slug, c))
  const variants = {}
  for (const c of cs)
    for (const s of sizes) {
      const key = `${c.name} / ${s}`
      const v = o.variants?.[key] ?? {}
      variants[key] = { shopifyId: v.shopifyId ?? null, available: v.available ?? null }
    }
  return {
    id: slug,
    slug,
    name,
    category,
    // Co-ords are one listing (top and bottom together, one price).
    soldAs: soldAs ?? (category === "Co-ord Set" ? "set" : "single"),
    price,
    compareAt: null,
    sizes,
    colours: cs,
    variants,
    details: {
      description: o.description ?? description ?? null,
      fabric: o.fabric ?? null,
      care: o.care ?? null,
      sizeChart: o.sizeChart ?? null,
    },
    tint,
    newIn: true,
    sourceUrl: onSite ? `https://khuwabb.com/products/${slug}` : null,
  }
}

// Numbered as in the owner's notebook.
const products = [
  P({
    slug: "ribbed-drawstring-wide-leg-trouser",
    name: "Ribbed Drawstring Wide Leg Trouser",
    category: "Trousers",
    price: 2500,
    sizes: UK_4_16,
    colours: [["Black", "black"], ["White", "off-white"], ["Pink", "pink"], ["Olive", "olive"]],
    tint: "rgb(246, 201, 207)",
    description:
      "A soft ribbed trouser with an elasticated drawstring waist, side pockets and a relaxed wide leg that falls straight to the ankle. Easy enough for lounging, neat enough for class or errands.",
  }),
  P({
    slug: "wide-leg-trouser-three-half-stripes",
    name: "Wide Leg Trouser with Three Half Stripes and Panel",
    category: "Trousers",
    price: 2500,
    sizes: SML,
    colours: [["Black", "black"], ["Blue", "blue"], ["Sky Blue", "sky-blue"], ["Pink", "pink"], ["Cherry", "cherry"], ["Peppercorn", "peppercorn"], ["Brown", "brown"], ["Mocha", "mocha"]],
    tint: "rgb(201, 210, 242)",
    description:
      "Our sporty wide-leg trouser with three contrast stripes that sweep down from the hip and a matching side panel. Drawstring waist, roomy wide leg and eight colours to pick from.",
  }),
  P({
    slug: "wide-leg-trouser-two-full-stripes",
    name: "Wide Leg Trouser with Two Full Stripes",
    category: "Trousers",
    price: 2500,
    sizes: SML,
    colours: [["Blue", "blue"], ["Cherry", "cherry"], ["Peppercorn", "peppercorn"], ["Brown", "brown"]],
    tint: "rgb(245, 231, 166)",
    description:
      "Two crisp contrast stripes run the full length of each leg on this clean, wide-leg trouser. An elasticated waist keeps it comfortable; the stripes keep it sharp.",
  }),
  P({
    slug: "shape-high-waist-wide-leg-jogger",
    name: "Shape High Waist Wide Leg Jogger",
    category: "Trousers",
    price: 2500,
    sizes: ["XS", "S", "M", "L"],
    colours: [["Cream", "cream"]],
    tint: "rgb(213, 229, 190)",
    description:
      "A high-waisted jogger with a tie-front drawstring and a wide, fluid leg. Soft cream that pairs with everything. Dress it up with a jacket or keep it easy with a tee.",
  }),
  P({
    slug: "women-trouser-two-full-panels",
    name: "Women Trouser with Two Full Panels",
    category: "Trousers",
    price: 2500,
    sizes: SML,
    colours: [["White with red stripes", "white-red"], ["Black with white stripes", "black-white"]],
    tint: "rgb(247, 210, 184)",
    description:
      "Bold contrast panels run down both sides of this straight wide-leg trouser, in white with red or black with white. An elasticated waist for all-day comfort.",
  }),
  P({
    slug: "cargo-pocket-trouser-for-women",
    name: "Cargo Pocket Trouser for Women",
    category: "Trousers",
    price: 2500,
    sizes: ["M", "L"],
    colours: [["White", "white"]],
    tint: "rgb(201, 210, 242)",
    description:
      "A clean white cargo trouser with flap pockets on each leg and a straight, relaxed fit. Utility details, softened for everyday wear.",
  }),
  P({
    slug: "seam-detail-co-ords-set",
    name: "Seam Detail Co-ords Set",
    category: "Co-ord Set",
    price: 3500,
    sizes: UK_4_14,
    colours: [["Black", "black"]],
    tint: "rgb(213, 229, 190)",
    description:
      "A fitted long-sleeve crew-neck top with a matching wide-leg trouser finished with sharp front seams. Sold together as a set: one easy outfit, top to toe.",
  }),
  P({
    slug: "womens-side-pocket-cotton-maxi-dress",
    name: "Women's Side Pocket Cotton Maxi Dress",
    category: "Dresses",
    price: 3500,
    sizes: SML,
    colours: [["Black", "black"], ["Khaki", "khaki"], ["Burgundy", "burgundy"]],
    tint: "rgb(245, 231, 166)",
    description:
      "A relaxed T-shirt maxi with short sleeves, a round neck and handy side pockets. It skims the body and flares gently to the ankle. Pull on and go.",
  }),
  P({
    slug: "boat-neck-long-sleeve-maxi-dress",
    name: "Boat Neck Long Sleeve Maxi Dress",
    category: "Dresses",
    price: 3800,
    sizes: UK_4_14,
    colours: [["Black", "black"], ["Brown", "brown"], ["Maroon", "maroon"]],
    tint: "rgb(246, 201, 207)",
    onSite: false,
    description:
      "A sleek, body-skimming maxi with a wide boat neckline and long fitted sleeves. Ankle length and quietly elegant, for dinners, events and evenings out.",
  }),
  P({
    slug: "ladies-vinyl-jacket",
    name: "Ladies Vinyl Jacket",
    category: "Jackets",
    price: 4500,
    sizes: ["S", "M", "L", "XL"],
    colours: [["Black", "black"], ["Red", "red"], ["Dark Green", "dark-green"]],
    tint: "rgb(247, 210, 184)",
    onSite: false,
    description:
      "A cropped, high-shine puffer with a stand-up funnel collar, zip front and elasticated cuffs and hem. Glossy, warm and impossible to miss.",
  }),
  P({
    slug: "womens-hooded-sleeveless-cropped-puffer-jacket",
    name: "Hooded Sleeveless Cropped Puffer Jacket",
    category: "Jackets",
    price: 3500,
    sizes: SML,
    colours: [["Beige", "beige"], ["Olive", "olive"], ["Black", "black"]],
    tint: "rgb(213, 229, 190)",
    description:
      "A cropped, hooded puffer gilet with a zip front and toggle drawcord hem. Layer it over hoodies and long sleeves when the weather can't decide.",
  }),
  P({
    slug: "womens-hooded-full-sleeve-cropped-puffer-jacket",
    name: "Hooded Full Sleeve Cropped Puffer Jacket",
    category: "Jackets",
    price: 4000,
    sizes: SML,
    colours: [["Olive", "olive"], ["Beige", "beige"], ["Black", "black"]],
    tint: "rgb(245, 231, 166)",
    description:
      "A cropped puffer with a drawcord hood, zip and snap front, two flap chest pockets and an elasticated hem. Warm, light and made to sit just above the waist.",
  }),
]

// Added 19 Nov 2026 from Khuwabb_Gymwear.zip: one set (top + leggings).
// Price and sizes confirmed by the owner (Rs.4,200; S, M, L). Blue
// background so the Light Pink colour stands out.
products.push(
  P({
    slug: "gym-co-ords-set",
    name: "Gym Co-ords Set",
    // Its own category (the home "Gym wear" card); still one listing.
    category: "Gymwear",
    soldAs: "set",
    price: 4200,
    sizes: SML,
    colours: [["Black", "black"], ["Warm Brown", "warm-brown"], ["Light Pink", "light-pink"], ["Pale Yellow", "pale-yellow"]],
    tint: "rgb(201, 210, 242)",
    onSite: false,
    description:
      "A cropped scoop-neck sports top with a wide banded hem, paired with matching high-waisted leggings. Sold together as a set: move, stretch and head out in one easy outfit.",
  }),
)

const noPhoto = products.flatMap((p) => p.colours.filter((c) => !c.image).map((c) => `${p.slug}/${c.name}`))
if (noPhoto.length) console.warn(`colours without photos: ${noPhoto.join(", ")}`)
const unknown = Object.keys(overrides).filter((k) => !products.some((p) => p.slug === k) && !k.startsWith("_"))
if (unknown.length) throw new Error(`catalog-overrides.json names unknown products: ${unknown.join(", ")}`)
writeFileSync("data/products.json", JSON.stringify(products, null, 2) + "\n")
const photos = products.reduce((n, p) => n + p.colours.filter((c) => c.image).length, 0)
const colours = products.reduce((n, p) => n + p.colours.length, 0)
console.log(`${products.length} products, ${photos}/${colours} colours photographed`, products.reduce((a, p) => ({ ...a, [p.category]: (a[p.category] ?? 0) + 1 }), {}))

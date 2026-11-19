// Section data for the Khuwabb homepage, built from data/products.json.
// Copy comes from khuwabb.com (19 Nov 2026). Photos stay the template's until
// the real ones arrive. Reviews are DRAFTS, flagged `draft: true` — replace
// with genuine customer reviews before launch.
import { readFileSync, writeFileSync } from "node:fs"

const products = JSON.parse(readFileSync("data/products.json", "utf8"))
const by = Object.fromEntries(products.map((p) => [p.slug, p]))
const orig = (f) => JSON.parse(readFileSync(`data/framer-original/${f}`, "utf8"))

// Moods replace the template's gelato flavours (same five colours).
const moods = [
  { name: "Campus", color: "rgb(213, 229, 190)" },
  { name: "Weekend", color: "rgb(246, 201, 207)" },
  { name: "Brunch", color: "rgb(245, 231, 166)" },
  { name: "Work", color: "rgb(201, 210, 242)" },
  { name: "Winter", color: "rgb(247, 210, 184)" },
]

// Hero reels: only the look settings live here; the pieces come from the
// catalog at render time (components/home/Hero.tsx).
const reels = orig("reels.json")
reels.flavours = moods.map((m, i) => ({ ...m, id: `mood-${i}` }))
delete reels.tops
delete reels.bottoms
delete reels.shoes
reels.currency = "Rs."
// No auto-shuffle: the outfit only changes when someone presses Shuffle
// (or drags/taps a row).
reels.autoShuffle = 0
writeFileSync("data/reels.json", JSON.stringify(reels, null, 2) + "\n")

// Gelato counter → mood tags over the campaign photo, each a three-piece look.
const counter = orig("gelato-counter.json")
const lookOf = (name, note, slugs) => {
  for (const s of slugs) if (!by[s]) throw new Error(`unknown product ${s}`)
  return { name, note, pieces: slugs }
}
const counterLooks = [
  lookOf("Campus days", "Easy wide trousers and a cropped gilet for early lectures.", ["ribbed-drawstring-wide-leg-trouser", "womens-hooded-sleeveless-cropped-puffer-jacket", "wide-leg-trouser-three-half-stripes"]),
  lookOf("Weekend plans", "Off-duty, on point — a soft jogger and a glossy puffer.", ["shape-high-waist-wide-leg-jogger", "ladies-vinyl-jacket", "wide-leg-trouser-two-full-stripes"]),
  lookOf("Brunch dates", "Two easy maxis and a statement panelled trouser.", ["womens-side-pocket-cotton-maxi-dress", "boat-neck-long-sleeve-maxi-dress", "women-trouser-two-full-panels"]),
  lookOf("Work mode", "Sharp seams and clean wide-leg trousers.", ["seam-detail-co-ords-set", "cargo-pocket-trouser-for-women", "women-trouser-two-full-panels"]),
  lookOf("Winter layers", "Cropped puffers for chilly days.", ["womens-hooded-full-sleeve-cropped-puffer-jacket", "ladies-vinyl-jacket", "ribbed-drawstring-wide-leg-trouser"]),
]
counter.flavours = counter.flavours.map((f, i) => {
  const { image1, image2, image3, price, link, ...rest } = f
  return { ...rest, ...counterLooks[i], color: moods[i].color }
})
// Campaign photo: the owner's "Wear the dream" shot (public/brand). Mood tags
// sit on the floor to the left of the model, one to her right.
counter.image = "/brand/wear-the-dream.jpg"
const spots = [[9, 89], [20, 89], [31, 89], [42, 89], [84, 89]]
counter.flavours = counter.flavours.map((f, i) => ({ ...f, x: spots[i][0], y: spots[i][1] }))
writeFileSync("data/gelato-counter.json", JSON.stringify(counter, null, 2) + "\n")

// Shop the look: four complete outfits from the catalog, each with the
// owner's lookbook photo (public/brand/looks) and the pieces worn in it.
const looksOrig = orig("looks.json")
const looks = [
  { slug: "daily-edit", name: "Daily edit", description: "A cropped puffer gilet over the ribbed drawstring trouser — easy layers for every day.", pieces: [["womens-hooded-sleeveless-cropped-puffer-jacket", "Beige"], ["ribbed-drawstring-wide-leg-trouser", "Black"]] },
  { slug: "off-duty", name: "Off duty", description: "The olive cropped puffer with our cream high-waist jogger. Soft, warm and weekend-ready.", pieces: [["womens-hooded-full-sleeve-cropped-puffer-jacket", "Olive"], ["shape-high-waist-wide-leg-jogger", "Cream"]] },
  { slug: "street-ready", name: "Street ready", description: "High shine meets sporty stripes — the black vinyl puffer with the two-stripe wide-leg trouser.", pieces: [["ladies-vinyl-jacket", "Black"], ["wide-leg-trouser-two-full-stripes", "Blue"]] },
  { slug: "brunch-dates", name: "Brunch dates", description: "The boat-neck maxi in maroon: sleek, long-sleeved and made for long lunches.", pieces: [["boat-neck-long-sleeve-maxi-dress", "Maroon"]] },
].map((l, i) => ({
  id: l.slug,
  ...l,
  pieces: l.pieces.map(([slug, colour]) => ({ slug, colour })),
  tint: looksOrig[i].tint,
  image: `/brand/looks/${l.slug}.jpg`,
  imageAlt: `The ${l.name} look: ${l.pieces.map(([slug, colour]) => `${by[slug]?.name} in ${colour}`).join(" with ")}`,
}))
for (const l of looks)
  for (const { slug, colour } of l.pieces) {
    if (!by[slug]) throw new Error(`look ${l.slug}: unknown product ${slug}`)
    if (!by[slug].colours.some((c) => c.name === colour)) throw new Error(`look ${l.slug}: ${slug} has no colour ${colour}`)
  }
writeFileSync("data/looks.json", JSON.stringify(looks, null, 2) + "\n")

// Reviews: DRAFT copy written for layout only — not real customers.
const receipts = [
  { order: "Order KH-1042 · 14 Oct 2026", lines: ["seam-detail-co-ords-set", "ribbed-drawstring-wide-leg-trouser"], quote: "“The co-ord is so comfortable I wore it to class three days running. Cash on delivery made it easy too.”", by: "Ayesha, Lahore", tilt: -3 },
  { order: "Order KH-1107 · 29 Oct 2026", lines: ["ladies-vinyl-jacket", "shape-high-waist-wide-leg-jogger"], quote: "“Exchanged a size within the week, no fuss. The jogger is the comfiest thing I own.”", by: "Hamza, Karachi", tilt: 2 },
  { order: "Order KH-1163 · 6 Nov 2026", lines: ["womens-hooded-full-sleeve-cropped-puffer-jacket", "wide-leg-trouser-two-full-stripes"], quote: "“The puffer is warm without being bulky, and the striped trousers get compliments every time.”", by: "Mahnoor, Islamabad", tilt: -1.5 },
].map((r) => ({ ...r, draft: true }))
for (const r of receipts) for (const s of r.lines) if (!by[s]) throw new Error(`receipt ${r.order}: unknown product ${s}`)
writeFileSync("data/receipts.json", JSON.stringify(receipts, null, 2) + "\n")

const intro = orig("scoop-intro.json")
intro.brand = "khuwabb"
writeFileSync("data/scoop-intro.json", JSON.stringify(intro, null, 2) + "\n")
console.log("looks", looks.length, "| receipts (draft)", receipts.length)

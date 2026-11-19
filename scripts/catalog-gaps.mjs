// Lists what each product is missing before it can be sold or fully shown.
// Usage: node scripts/catalog-gaps.mjs [--md]  (writes data/catalog-gaps.md with --md)
import { readFileSync, writeFileSync } from "node:fs"

const products = JSON.parse(readFileSync("data/products.json", "utf8"))
const rows = products.map((p) => {
  const variants = Object.entries(p.variants)
  const noId = variants.filter(([, v]) => !v.shopifyId).length
  const noStock = variants.filter(([, v]) => v.available !== true).length
  const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const photos = p.colours.flatMap((c) => ["front", "side", "back"].filter((v) => !c.views?.[v]).map((v) => `Khuwabb_Color_Variants/<NN>-…/${kebab(c.name)}/${v}.webp`))
  const missing = [
    typeof p.price !== "number" && "price",
    !p.sizes.length && "sizes",
        !p.details.fabric && "fabric",
    !p.details.care && "care",
    !p.details.sizeChart && "size chart",
    noId && `Shopify variant IDs (${noId}/${variants.length})`,
    noStock && `stock (${noStock}/${variants.length})`,
  ].filter(Boolean)
  return { slug: p.slug, name: p.name, missing, photos, orderable: variants.some(([, v]) => v.shopifyId && v.available === true) }
})

const md = [
  "# Catalog gaps",
  "",
  `Generated ${new Date().toISOString().slice(0, 10)} from data/products.json. Prices, colours and sizes come from the owner's notebook; descriptions were written from the photos. A product can't be ordered until its variants have a Shopify ID and confirmed stock (data/catalog-overrides.json).`,
  "",
  "| Product | Orderable | Missing details | Photos needed |",
  "| --- | --- | --- | --- |",
  ...rows.map((r) => `| ${r.name} | ${r.orderable ? "yes" : "no"} | ${r.missing.join(", ") || "—"} | ${r.photos.map((f) => `\`${f}\``).join("<br>") || "—"} |`),
  "",
].join("\n")

if (process.argv.includes("--md")) writeFileSync("data/catalog-gaps.md", md)
console.log(md)

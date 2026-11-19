// Turns the Framer CMS dump (data/.cms-raw.json, read from the snapshot with
// DatabaseCollection.scanItems) into readable product and look records.
import { readFileSync, writeFileSync } from "node:fs"
import { localAsset } from "./lib/framer-assets.mjs"

const raw = JSON.parse(readFileSync("data/.cms-raw.json", "utf8"))
const img = (v) => (v?.src ? localAsset(v.src) : null)
// Detail-page gallery shots were never loaded by the captured pages.
const maybeImg = (v) => {
  try {
    return img(v)
  } catch {
    return null
  }
}

const products = raw.products.rows.map((r) => ({
  id: r.id,
  slug: r.TwK2PLDmB,
  name: r.qHjyRUb0l,
  price: r.pZFB4PDwU,
  category: r.h7LDBAo43?.title ?? null,
  colour: r.SZU4Y5KW9 ?? null,
  tint: r.scGFVJTJQ ?? null,
  description: r.dzmWtEQHA ?? "",
  newIn: !!r.uFYrUbD4n,
  sizes: (r["v-sizes"] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  image: img(r.GDSBdR0X6),
  gallery: [maybeImg(r["v-img2"]), maybeImg(r["v-img3"])].filter(Boolean),
  buyLink: r.GEK_WaDXP ?? null,
}))

const byId = new Map(products.map((p) => [p.id, p.slug]))
const looks = raw.looks.rows.map((r) => ({
  id: r.id,
  slug: r.ljDb5_lGl,
  name: r.SRSsOmIFz,
  tint: r.GiAtboIGG,
  description: r.Oj88RnpfP,
  image: img(r.Vxntpiwcg),
  imageAlt: r.Vxntpiwcg?.alt ?? "",
  pieces: (r.KeOj9ZOgt ?? []).map((id) => byId.get(id)),
}))

writeFileSync("data/products.json", JSON.stringify(products, null, 2) + "\n")
writeFileSync("data/looks.json", JSON.stringify(looks, null, 2) + "\n")
console.log(`${products.length} products (${products.filter((p) => p.newIn).length} new in), ${looks.length} looks`)
console.log([...new Set(products.map((p) => p.category))])

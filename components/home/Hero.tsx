import reels from "@/data/reels.json"
import { photo, products, type Product } from "@/lib/catalog"
import { responsive } from "@/lib/img"
import { ScoopReels, type Piece, type ReelsConfig } from "../ScoopReels"
import styles from "./Hero.module.css"

// Outfit reels built from the catalog: a jacket rides over a trouser. Co-ord
// sets and dresses are complete outfits and stay out of the shuffle.
// One piece per colour: `id` is "<slug>#<colour>" so the look chooser can
// preselect the colour shown.
const pieces = (p: Product): Piece[] =>
  p.colours
    .filter((c) => c.image)
    .map((c) => {
      const r = responsive(photo(p, c.name).src)
      return { id: `${p.slug}#${c.name}`, name: p.name, price: p.price, image: r.src, srcSet: r.srcSet, fit: "any" }
    })

// The design wants full rows (the original runs 12–17 pieces a row). Short
// rows repeat their pieces round the ring; the shuffle skips repeats of the
// piece already shown. Neighbouring colours of one product are interleaved
// with other products so the ring doesn't show three of the same cut.
const ROW_SLOTS = 12
const interleave = (groups: Piece[][]) => {
  const out: Piece[] = []
  for (let i = 0; i < Math.max(0, ...groups.map((g) => g.length)); i++) for (const g of groups) if (g[i]) out.push(g[i])
  return out
}
const fill = (list: Piece[]) => (list.length < 2 ? list : Array.from({ length: Math.max(ROW_SLOTS, list.length) }, (_, i) => list[i % list.length]))

// The black gym set joins the reels as two pieces (top above, leggings
// below). Both carry the set's id, so the look counts and adds it once.
const gym = products.find((p) => p.slug === "gym-co-ords-set")
const gymPiece = (part: "top" | "bottom"): Piece[] => {
  const src = `/products/gym-co-ords-set/black/piece-${part}.webp`
  if (!gym) return []
  const r = responsive(src)
  return [{ id: "gym-co-ords-set#Black", name: gym.name, price: gym.price, image: r.src, srcSet: r.srcSet, fit: "any" }]
}

const config = {
  ...reels,
  tops: fill(interleave([...products.filter((p) => p.category === "Jackets").map(pieces), gymPiece("top")])),
  bottoms: fill(interleave([...products.filter((p) => p.category === "Trousers").map(pieces), gymPiece("bottom")])),
  // Khuwabb sells no shoes, so the reels have two rows.
  shoes: [],
} as unknown as ReelsConfig

export function Hero() {
  return (
    <section className={styles.hero} data-section="hero">
      <ScoopReels config={config} />
    </section>
  )
}

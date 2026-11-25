"use client"

import { m } from "framer-motion"
import { useState } from "react"
import { BELOW_DESKTOP, useMedia } from "@/lib/useMedia"
import { categoryGroup, getProduct, products, type Product } from "@/lib/catalog"
import { Appear } from "../Appear"
import { SectionHeader } from "./SectionHeader"
import styles from "./Flavours.module.css"
import { responsive } from "@/lib/img"
import { LaterImg } from "../LaterImg"

type Category = { name: string; match: (p: Product) => boolean; tint: string; image: string; ratio: number; wide?: boolean; tilt: number }

// One card per category; hovering a card widens it (desktop). The cut-out
// leans further when its card is open.
// Each card shows one real product photo: [slug, colour].
const cover = (slug: string, colour: string) => {
  const p = getProduct(slug)
  const c = p?.colours.find((x) => x.name === colour) ?? p?.colours[0]
  return { image: c?.image ?? "", ratio: c?.ratio ?? 0.8 }
}

const CATEGORIES: Category[] = [
  { name: "Gym wear", match: (p) => categoryGroup(p.category) === "Gym wear", tint: "var(--pistachio)", ...cover("gym-co-ords-set", "Light Pink"), tilt: -1 },
  { name: "Trousers", match: (p) => categoryGroup(p.category) === "Trousers", tint: "var(--lemon)", ...cover("wide-leg-trouser-two-full-stripes", "Cherry"), tilt: 1 },
  { name: "Jackets", match: (p) => categoryGroup(p.category) === "Jackets", tint: "var(--blueberry)", ...cover("ladies-vinyl-jacket", "Red"), tilt: -1 },
  { name: "Dresses", match: (p) => categoryGroup(p.category) === "Dresses", tint: "var(--strawberry)", ...cover("boat-neck-long-sleeve-maxi-dress", "Maroon"), tilt: 1 },
  { name: "Tops", match: (p) => categoryGroup(p.category) === "Tops", tint: "var(--lemon)", ...cover("premium-velvet-high-neck-top-women", "Purple"), tilt: -1 },
  { name: "New in", match: (p) => p.newIn, tint: "var(--peach)", ...cover("womens-hooded-full-sleeve-cropped-puffer-jacket", "Olive"), tilt: 1 },
]

const counts = Object.fromEntries(CATEGORIES.map((c) => [c.name, products.filter(c.match).length]))
// An empty category gets no card rather than a "0 pieces" dead end.
const SHOWN = CATEGORIES.filter((c) => counts[c.name] > 0)

const SPRING = { type: "spring", bounce: 0.15, duration: 0.9 } as const

export function Flavours() {
  const [open, setOpen] = useState(SHOWN[0]?.name ?? "")
  // Below 1200px the cards stack and every caption shows.
  const stacked = useMedia(BELOW_DESKTOP)

  return (
    <section className={styles.section} data-section="flavours">
      <SectionHeader title="Find your fit" cta={{ href: "/shop", label: "All collections" }} />
      <Appear preset="lift" className={styles.scoops}>
        <div className={styles.row}>
          {SHOWN.map((c) => {
            const isOpen = c.name === open
            const shown = stacked || isOpen
            const tilt = c.tilt * (isOpen && !stacked ? 6 : 4)
            return (
              <m.a
                key={c.name}
                href="/shop"
                className={styles.card}
                initial={false}
                animate={{ flexGrow: stacked ? 0 : isOpen ? 2.6 : 1 }}
                transition={SPRING}
                data-open={isOpen || undefined}
                data-card={c.name}
                style={{ background: c.tint }}
                onMouseEnter={() => setOpen(c.name)}
              >
                <div className={styles.piece}>
                  <m.div
                    transition={SPRING}
                    className={styles.cutout}
                    data-wide={c.wide || undefined}
                    style={{ aspectRatio: c.ratio }}
                    initial={false}
                    animate={{ rotate: tilt, ...(c.wide ? { width: stacked ? "66%" : isOpen ? "70%" : "92%" } : { height: stacked ? "86%" : isOpen ? "78%" : "44%" }) }}
                  >
                    <LaterImg {...responsive(c.image)} sizes="(max-width: 809px) 45vw, (max-width: 1199px) 30vw, 360px" alt="" draggable={false} loading="lazy" decoding="async" />
                  </m.div>
                </div>
                <m.div transition={SPRING} className={styles.caption} initial={false} animate={{ opacity: shown ? 1 : 0 }}>
                  <h3 className={styles.name}>{c.name}</h3>
                  <div className={styles.count}>
                    <p>
                      {counts[c.name] ?? 0} {counts[c.name] === 1 ? "piece" : "pieces"}
                    </p>
                  </div>
                </m.div>
                <m.h3 className={styles.side} aria-hidden initial={false} animate={{ opacity: shown ? 0 : 1 }} transition={SPRING}>
                  {c.name}
                </m.h3>
              </m.a>
            )
          })}
        </div>
      </Appear>
    </section>
  )
}

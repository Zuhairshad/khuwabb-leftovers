"use client"

import { m, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import counter from "@/data/gelato-counter.json"
import { getProduct, photo, type Product } from "@/lib/catalog"
import { formatPrice } from "@/lib/format"
import { PHONE, useMedia } from "@/lib/useMedia"
import { GelatoCounter, type CounterFlavour } from "../GelatoCounter"
import styles from "./FreshDaily.module.css"

// Mood looks name catalog products; images and the total come from there.
const looks: CounterFlavour[] = counter.flavours.map((f) => {
  const ps = f.pieces.map((slug) => getProduct(slug)).filter((p): p is Product => !!p)
  const priced = ps.every((p) => typeof p.price === "number")
  const [a, b, c] = ps.map((p) => photo(p).src)
  return {
    ...f,
    price: priced ? formatPrice(ps.reduce((n, p) => n + (p.price ?? 0), 0)) : "",
    link: "/shop",
    image1: a ?? "",
    image2: b ?? a ?? "",
    image3: c ?? a ?? "",
  }
})

// Each word slides in from its side as it rises into view.
function Word({ children, from }: { children: string; from: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] })
  const x = useTransform(scrollYProgress, [0, 1], [from, 0])
  const opacity = useTransform(scrollYProgress, [0, 1], [0.2, 1])
  return (
    <m.div ref={ref} style={{ x, opacity }}>
      <h1 className={styles.word}>{children}</h1>
    </m.div>
  )
}

export function FreshDaily() {
  // On phones the photo is anchored further right to keep her in frame.
  const phone = useMedia(PHONE)
  return (
    <section className={styles.section} data-section="fresh-daily">
      <div className={styles.words}>
        <Word from={-180}>Wear the</Word>
        <Word from={180}>dream</Word>
      </div>
      <div className={styles.campaign}>
        <div className={styles.counter}>
          <GelatoCounter
            image={counter.image}
            imageAlt="Khuwabb campaign photo"
            flavours={looks}
            cta={counter.cta}
            radius={counter.radius}
            focusX={phone ? 62 : counter.focusX}
            cycle={counter.cycle}
          />
        </div>
      </div>
    </section>
  )
}

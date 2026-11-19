"use client"

import { m } from "framer-motion"
import styles from "./ShopIntro.module.css"
import { responsive } from "@/lib/img"

const ease = [0.22, 1, 0.36, 1] as const

// Page-load entrance: the freezer photo settles in, then the heading and the
// note rise after it.
export function ShopIntro() {
  return (
    <section className={styles.intro} data-section="intro">
      <m.div
        className={styles.freezer}
        initial={{ opacity: 0.001, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 1.4, ease }}
      >
        <img {...responsive("/brand/collections.jpg")} sizes="(max-width: 1279px) calc(100vw - 32px), 1216px" fetchPriority="high" alt="Khuwabb pieces on a clothes rail: a pink trouser, black top and trouser, maroon maxi and an olive puffer" />
      </m.div>
      <div className={styles.heading}>
        <m.div className={styles.titleWrap} initial={{ opacity: 0.001, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1.2, ease }}>
          <h1 className={styles.title}>All collections</h1>
        </m.div>
        <m.p className={styles.note} initial={{ opacity: 0.001, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 1.2, ease }}>
          Gym wear, co-ords, trousers, jackets and dresses. Tap anything to take a closer look.
        </m.p>
      </div>
    </section>
  )
}

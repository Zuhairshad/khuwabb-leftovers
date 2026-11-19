"use client"

import { m } from "framer-motion"
import receipts from "@/data/receipts.json"
import { getProduct } from "@/lib/catalog"
import { formatPrice } from "@/lib/format"
import { Appear } from "../Appear"
import styles from "./Receipts.module.css"

// Testimonials as till receipts: they drop in one after another and can be
// picked up and thrown around.
// NOTE: data/receipts.json holds DRAFT reviews (draft: true) written for the
// layout. Replace them with genuine customer reviews before launch.
const STAR =
  "M 9.749 15.477 L 14.879 18.632 C 15.151 18.797 15.496 18.782 15.753 18.594 C 16.01 18.406 16.128 18.082 16.053 17.772 L 14.658 11.886 L 19.223 7.948 C 19.461 7.739 19.552 7.409 19.455 7.108 C 19.357 6.806 19.09 6.592 18.774 6.563 L 12.783 6.075 L 10.475 0.488 C 10.354 0.193 10.068 0 9.749 0 C 9.431 0 9.144 0.193 9.023 0.488 L 6.715 6.075 L 0.724 6.563 C 0.406 6.59 0.136 6.806 0.038 7.109 C -0.06 7.412 0.034 7.745 0.275 7.953 L 4.84 11.89 L 3.445 17.772 C 3.37 18.082 3.488 18.406 3.745 18.594 C 4.002 18.782 4.347 18.797 4.619 18.632 Z"

function Star() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path d={STAR} transform="translate(2.251 2.25)" fill="#17140f" stroke="#17140f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const DELAYS = [0.15, 0.33, 0.51]

export function Receipts() {
  return (
    <section className={styles.section} data-section="receipts">
      <Appear preset="rise">
        <h2 className={styles.title}>Seen on you</h2>
      </Appear>
      <div className={styles.row}>
        {receipts.map((r, i) => {
          const lines = r.lines.map((slug) => getProduct(slug)).flatMap((p) => (p ? [{ name: p.name, price: p.price }] : []))
          const total = lines.reduce((n, l) => n + (l.price ?? 0), 0)
          const t = { type: "spring", bounce: 0.25, duration: 1.4, delay: DELAYS[i] } as const
          return (
            <m.div
              key={r.order}
              className={styles.receipt}
              style={{ rotate: r.tilt }}
              variants={{ hidden: { opacity: 0, y: -80, transition: t }, shown: { opacity: 1, y: 0, transition: t } }}
              initial="hidden"
              animate="hidden"
              whileInView="shown"
              viewport={{ amount: 0.25 }}
              drag
              dragMomentum
              whileTap={{ cursor: "grabbing" }}
            >
              <div className={styles.paper}>
                <div className={styles.head}>
                  <p className={styles.brand}>khuwabb</p>
                  <p className={styles.order}>{r.order}</p>
                </div>
                <div className={styles.dash} />
                {lines.map((l) => (
                  <div key={l.name} className={styles.line}>
                    <p className={styles.lineName}>{l.name}</p>
                    <p>{formatPrice(l.price)}</p>
                  </div>
                ))}
                <div className={styles.dash} />
                <div className={`${styles.line} ${styles.total}`}>
                  <p className={styles.lineName}>Total</p>
                  <p>{formatPrice(total)}</p>
                </div>
                <div className={styles.dash} />
                <div className={styles.stars} aria-label="5 stars">
                  {Array.from({ length: 5 }, (_, s) => (
                    <Star key={s} />
                  ))}
                </div>
                <p className={styles.quote}>{r.quote}</p>
                <p className={styles.by}>{r.by}</p>
              </div>
              <svg className={styles.tear} viewBox="0 0 340 14" preserveAspectRatio="none" aria-hidden>
                <path
                  d="M0 0H340V2 L330 14 L320 2 L310 14 L300 2 L290 14 L280 2 L270 14 L260 2 L250 14 L240 2 L230 14 L220 2 L210 14 L200 2 L190 14 L180 2 L170 14 L160 2 L150 14 L140 2 L130 14 L120 2 L110 14 L100 2 L90 14 L80 2 L70 14 L60 2 L50 14 L40 2 L30 14 L20 2 L10 14 L0 2 Z"
                  fill="#FFFFFF"
                />
              </svg>
            </m.div>
          )
        })}
      </div>
    </section>
  )
}

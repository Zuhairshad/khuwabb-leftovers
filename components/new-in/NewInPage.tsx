"use client"

import { m } from "framer-motion"
import { photo, productHref, products } from "@/lib/catalog"
import { formatPrice } from "@/lib/format"
import { Hook } from "../home/NewIn"
import styles from "./NewInPage.module.css"
import { atLeast, responsive } from "@/lib/img"

const ease = [0.22, 1, 0.36, 1] as const
const NEW_IN = products.filter((p) => p.newIn)

export function NewInPage() {
  return (
    <section className={styles.page} data-section="new-in-page">
      <div className={styles.header}>
        <m.div
          className={styles.photo}
          initial={{ opacity: 0.001, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 1.4, ease }}
        >
          <img {...responsive("/framer/images/YiUnZTXr74PD1drE1Th6MZvyUj4.0cgnl3i.png")} sizes="(max-width: 809px) calc(100vw - 32px), 360px" fetchPriority="high" alt="" />
        </m.div>
        <div className={styles.title}>
          <m.h1 initial={{ opacity: 0.001, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1.2, ease }}>
            New arrivals
          </m.h1>
          <m.p initial={{ opacity: 0.001, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 1.2, ease }}>
            Just dropped — fresh, easy co-ords and statement fits. New drops every week.
          </m.p>
        </div>
      </div>

      <div className={styles.grid} data-section="new-in-grid">
        {NEW_IN.map((p) => (
          <m.a
            key={p.id}
            href={productHref(p)}
            className={styles.hanger}
            style={{ originY: 0 }}
            whileHover={{ rotate: 5, transition: { type: "spring", bounce: 0.55, duration: 1.1 } }}
          >
            <Hook />
            <div className={styles.card} style={{ background: p.tint ?? undefined }}>
              <img src={atLeast(photo(p).src, 360)} alt={p.name} draggable={false} loading="lazy" decoding="async" />
            </div>
            <div className={styles.info}>
              <p className={styles.name}>{p.name}</p>
              <p className={styles.price}>{formatPrice(p.price)}</p>
            </div>
          </m.a>
        ))}
      </div>
    </section>
  )
}

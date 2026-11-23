"use client"

import { m } from "framer-motion"
import { photo, productHref, products } from "@/lib/catalog"
import { ProductPrice } from "@/components/product/ProductPrice"
import { Ticker } from "../Ticker"
import { SectionHeader } from "./SectionHeader"
import styles from "./NewIn.module.css"
import { atLeast } from "@/lib/img"
import { LaterImg } from "../LaterImg"

const NEW_IN = products.filter((p) => p.newIn).slice(0, 14)

export function Hook() {
  return (
    <svg viewBox="0 0 120 62" width="120" height="62" fill="none" aria-hidden>
      <path d="M60 30V24.5c0-3.2 6.5-4.6 6.5-11a6.5 6.5 0 1 0-13 0" stroke="#17140F" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 30 L10 56.5 c-3.4 1.8-2.4 4.5 1.5 4.5 h97 c3.9 0 4.9-2.7 1.5-4.5 Z" stroke="#17140F" strokeWidth="3" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export function NewIn() {
  return (
    <section className={styles.section} data-section="new-in">
      <SectionHeader title="New arrivals" cta={{ href: "/new-in", label: "Shop new in" }} />
      <div className={styles.rack}>
        <div className={styles.rail} />
        <Ticker className={styles.ticker} listClassName={styles.list} velocity={34} gap={28}>
          {NEW_IN.map((p) => (
            <m.a
              key={p.id}
              href={productHref(p)}
              className={styles.hanger}
              draggable={false}
              style={{ originY: 0 }}
              whileHover={{ rotate: 5, transition: { type: "spring", bounce: 0.55, duration: 1.1 } }}
            >
              <Hook />
              <div className={styles.card} style={{ background: p.tint ?? "#09F" }}>
                <LaterImg src={atLeast(photo(p).src, 360)} alt={p.name} draggable={false} loading="lazy" decoding="async" />
              </div>
              <div className={styles.info}>
                <p className={styles.name}>{p.name}</p>
                <p><ProductPrice price={p.price} compareAt={p.compareAt} /></p>
              </div>
            </m.a>
          ))}
        </Ticker>
      </div>
    </section>
  )
}

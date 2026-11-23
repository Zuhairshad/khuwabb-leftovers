"use client"

import { m } from "framer-motion"
import { photo, productHref, products } from "@/lib/catalog"
import { atLeast } from "@/lib/img"
import { ProductPrice } from "@/components/product/ProductPrice"
import styles from "./ProductGrid.module.css"

const rise = { duration: 1.1, ease: [0.22, 1, 0.36, 1] } as const

// Every product as an arched "scoop" card; each card rises in as it enters
// and its cut-out pops on hover.
export function ProductGrid() {
  return (
    <div className={styles.grid}>
      {products.map((p, i) => (
        <m.a
          key={p.id}
          href={productHref(p)}
          className={styles.product}
          variants={{ hidden: { opacity: 0, y: 60, transition: rise }, shown: { opacity: 1, y: 0, transition: rise } }}
          initial="hidden"
          animate="hidden"
          whileInView="shown"
          viewport={{ amount: 0.15 }}
        >
          <div className={styles.card} style={{ background: p.tint ?? undefined }}>
            <m.div
              className={styles.cutout}
              whileHover={{ rotate: -3, scale: 1.08, y: -6, transition: { type: "spring", bounce: 0.45, duration: 0.9 } }}
            >
              <img src={atLeast(photo(p).src, 360)} alt={p.name} draggable={false} loading={i < 4 ? "eager" : "lazy"} decoding="async" />
            </m.div>
          </div>
          <div className={styles.info}>
            <p className={styles.name}>{p.name}</p>
            <p className={styles.price}><ProductPrice price={p.price} compareAt={p.compareAt} /></p>
          </div>
        </m.a>
      ))}
    </div>
  )
}

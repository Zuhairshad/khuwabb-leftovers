import type { Metadata } from "next"
import { ShopIntro } from "@/components/shop/ShopIntro"
import { ProductGrid } from "@/components/shop/ProductGrid"
import styles from "./page.module.css"

export const metadata: Metadata = { title: "All collections · Khuwabb" }

export default function ShopPage() {
  return (
    <>
      <ShopIntro />
      <section className={styles.products} data-section="products">
        <ProductGrid />
      </section>
    </>
  )
}

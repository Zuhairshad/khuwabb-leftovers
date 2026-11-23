import type { Metadata } from "next"
import { ShopIntro } from "@/components/shop/ShopIntro"
import { ProductGrid } from "@/components/shop/ProductGrid"
import { absoluteUrl } from "@/lib/site"
import styles from "./page.module.css"

const TITLE = "All collections · Khuwabb"
const DESCRIPTION = "Shop every Khuwabb collection: pret, couture and new in, all in one place."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/shop" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/shop",
    siteName: "Khuwabb",
    locale: "en_PK",
    images: [{ url: absoluteUrl("/brand/collections.jpg") }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [absoluteUrl("/brand/collections.jpg")] },
}

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

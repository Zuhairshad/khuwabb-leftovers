import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ProductDetail } from "@/components/product/ProductDetail"
import { getProduct, products } from "@/lib/catalog"

type Params = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = getProduct((await params).slug)
  return { title: p ? `${p.name} · Khuwabb` : "Khuwabb" }
}

export default async function ProductPage({ params }: Params) {
  const p = getProduct((await params).slug)
  if (!p) notFound()
  return <ProductDetail slug={p.slug} />
}

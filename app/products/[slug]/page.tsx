import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ProductDetail } from "@/components/product/ProductDetail"
import { getProduct, photo, productHref, products } from "@/lib/catalog"
import { breadcrumbJsonLd, jsonLd, productJsonLd } from "@/lib/jsonld"
import { absoluteUrl, trimTo } from "@/lib/site"

type Params = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = getProduct((await params).slug)
  if (!p) return { title: "Khuwabb" }
  const title = `${p.name} · Khuwabb`
  const description = p.details.description ? trimTo(p.details.description) : `Shop ${p.name} at Khuwabb.`
  const image = absoluteUrl(photo(p).src)
  return {
    title,
    description,
    alternates: { canonical: productHref(p) },
    openGraph: {
      type: "website",
      title,
      description,
      url: productHref(p),
      siteName: "Khuwabb",
      locale: "en_PK",
      images: [{ url: image }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  }
}

export default async function ProductPage({ params }: Params) {
  const p = getProduct((await params).slug)
  if (!p) notFound()
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: p.name, path: productHref(p) },
  ])
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productJsonLd(p)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumb) }} />
      <ProductDetail slug={p.slug} />
    </>
  )
}

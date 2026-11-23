import type { Product } from "./catalog"
import { canOrder, photo, productHref } from "./catalog"
import { absoluteUrl } from "./site"

// Renders structured data safely: JSON.stringify output can legally contain
// "</script>", which would close the tag early, so `<` is escaped.
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Khuwabb",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/brand/logo.png"),
  }
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Khuwabb",
    url: absoluteUrl("/"),
  }
}

// Every variant carries the same catalog price (the site shows one price per
// product, not per-variant), so each Offer differs only by variant identity
// and stock. One Offer per colour/size combination that has a Shopify variant.
export function productJsonLd(p: Product) {
  const images = p.colours.filter((c) => c.image).map((c) => absoluteUrl(c.image as string))
  const offers = p.sizes.flatMap((size) =>
    p.colours
      .filter((c) => p.variants[`${c.name} / ${size}`]?.shopifyId)
      .map((c) => {
        const v = p.variants[`${c.name} / ${size}`]
        return {
          "@type": "Offer" as const,
          sku: v?.shopifyId ?? undefined,
          name: `${p.name} - ${c.name} / ${size}`,
          price: typeof p.price === "number" ? p.price : undefined,
          priceCurrency: "PKR",
          availability: canOrder(p, c.name, size) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: absoluteUrl(productHref(p)),
        }
      }),
  )
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.details.description ?? undefined,
    image: images.length ? images : [absoluteUrl(photo(p).src)],
    brand: { "@type": "Brand", name: "Khuwabb" },
    offers: offers.length > 1 ? offers : offers[0],
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

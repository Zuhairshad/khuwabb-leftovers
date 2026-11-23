import type { MetadataRoute } from "next"
import { productHref, products } from "@/lib/catalog"
import { absoluteUrl } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/shop"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/new-in"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ]
  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: absoluteUrl(productHref(p)),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }))
  return [...staticRoutes, ...productRoutes]
}

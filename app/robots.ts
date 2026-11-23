import type { MetadataRoute } from "next"
import { absoluteUrl } from "@/lib/site"

// No /api or /account route exists to shield; the whole site is public.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}

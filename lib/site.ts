// Canonical site origin for metadata, sitemap and JSON-LD. Set
// NEXT_PUBLIC_SITE_URL in Vercel once the production domain is final.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://khuwabb-export-factory-leftovers.vercel.app").replace(/\/+$/, "")

// Shopify CDN image URLs (and anything else already absolute) are returned
// unchanged - prefixing SITE_URL onto them would double them up.
export const absoluteUrl = (path = "/") => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`)

// Trims to ~max chars without cutting mid-word, for meta descriptions.
export function trimTo(text: string, max = 155) {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(" ")
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`
}

// The brand's Instagram profile, used by the home-page feed and the footer
// icon. NEXT_PUBLIC_INSTAGRAM_URL overrides it.
export const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/khuwabb.co/"

import variants from "@/data/image-sizes.json"

// Responsive sources for a public image, from scripts/optimize-images.mjs.
// `src` is the largest WebP variant (or the original when it has none) so
// browsers without srcset support still get a sensible file.
type Variant = { src: string; w: number; h: number }
const MAP = variants as Record<string, Variant[]>

// Shopify-only products (no local photography, no pre-generated
// image-sizes.json entry) have Shopify CDN URLs as their photo. Shopify
// serves a resized copy for any `width=` query param, so a srcset is built
// on the fly instead of from the sizes map.
const SHOPIFY_CDN_WIDTHS = [480, 768, 1024, 1600]
const isShopifyCdn = (path: string) => /^https:\/\/cdn\.shopify\.com\//.test(path)
function shopifyAt(path: string, width: number) {
  const u = new URL(path)
  u.searchParams.set("width", String(width))
  return u.toString()
}

export function responsive(path: string) {
  if (isShopifyCdn(path)) {
    const top = SHOPIFY_CDN_WIDTHS[SHOPIFY_CDN_WIDTHS.length - 1]
    return {
      src: shopifyAt(path, top),
      srcSet: SHOPIFY_CDN_WIDTHS.map((w) => `${shopifyAt(path, w)} ${w}w`).join(", "),
      width: undefined as number | undefined,
      height: undefined as number | undefined,
    }
  }
  const list = MAP[path]
  if (!list?.length) return { src: path, srcSet: undefined as string | undefined, width: undefined as number | undefined, height: undefined as number | undefined }
  const sorted = [...list].sort((a, b) => a.w - b.w)
  const top = sorted[sorted.length - 1]
  return { src: top.src, srcSet: sorted.map((v) => `${v.src} ${v.w}w`).join(", "), width: top.w, height: top.h }
}

/** The smallest variant at least `minHeight` px tall (for fixed small boxes). */
export function atLeast(path: string, minHeight: number) {
  if (isShopifyCdn(path)) return shopifyAt(path, Math.min(Math.max(minHeight * 2, 480), 1024))
  const list = [...(MAP[path] ?? [])].sort((a, b) => a.h - b.h)
  return (list.find((v) => v.h >= minHeight) ?? list[list.length - 1])?.src ?? path
}

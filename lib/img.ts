import variants from "@/data/image-sizes.json"

// Responsive sources for a public image, from scripts/optimize-images.mjs.
// `src` is the largest WebP variant (or the original when it has none) so
// browsers without srcset support still get a sensible file.
type Variant = { src: string; w: number; h: number }
const MAP = variants as Record<string, Variant[]>

export function responsive(path: string) {
  const list = MAP[path]
  if (!list?.length) return { src: path, srcSet: undefined as string | undefined, width: undefined as number | undefined, height: undefined as number | undefined }
  const sorted = [...list].sort((a, b) => a.w - b.w)
  const top = sorted[sorted.length - 1]
  return { src: top.src, srcSet: sorted.map((v) => `${v.src} ${v.w}w`).join(", "), width: top.w, height: top.h }
}

/** The smallest variant at least `minHeight` px tall (for fixed small boxes). */
export function atLeast(path: string, minHeight: number) {
  const list = [...(MAP[path] ?? [])].sort((a, b) => a.h - b.h)
  return (list.find((v) => v.h >= minHeight) ?? list[list.length - 1])?.src ?? path
}

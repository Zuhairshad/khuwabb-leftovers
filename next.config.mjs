import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL(".", import.meta.url))

/** @type {import("next").NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Strict mode double-mounts effects in dev. The hero reels start their
  // intro shuffle on mount, so a second mount draws extra random picks and the
  // dev server would no longer match the visual tests (or production).
  reactStrictMode: false,
  outputFileTracingRoot: root,
  // Lets a second dev server (the orderable test fixture) run beside this one.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Shopify-only products (no local photography) use their Shopify CDN
  // photo directly; next/image (if ever used for them) needs this host
  // allow-listed.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com" }],
  },
  experimental: {
    // Only the framer-motion exports each file uses end up in its chunk.
    optimizePackageImports: ["framer-motion"],
    // Inlining page CSS was measured and made mobile Lighthouse worse
    // (bigger HTML outweighs two small stylesheet requests); off unless
    // INLINE_CSS=1 for experiments.
    inlineCss: process.env.INLINE_CSS === "1",
  },
  // Old Shopify URLs, permanently redirected to their headless equivalents.
  // /pages/* and /blogs/* have no equivalent here and are left to 404.
  async redirects() {
    return [
      { source: "/collections/all", destination: "/shop", permanent: true },
      { source: "/collections", destination: "/shop", permanent: true },
      { source: "/collections/:handle", destination: "/shop", permanent: true },
      // No cart page: the bag is a drawer opened from the nav, not a route.
      { source: "/cart", destination: "/shop", permanent: true },
    ]
  },
}

export default nextConfig

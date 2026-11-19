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
  experimental: {
    // Only the framer-motion exports each file uses end up in its chunk.
    optimizePackageImports: ["framer-motion"],
    // Inlining page CSS was measured and made mobile Lighthouse worse
    // (bigger HTML outweighs two small stylesheet requests); off unless
    // INLINE_CSS=1 for experiments.
    inlineCss: process.env.INLINE_CSS === "1",
  },
}

export default nextConfig

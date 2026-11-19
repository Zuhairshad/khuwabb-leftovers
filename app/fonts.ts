import localFont from "next/font/local"

// Self-hosted brand fonts. next/font preloads them and generates
// metric-matched fallbacks (size-adjust / ascent overrides), so text doesn't
// jump when the web fonts swap in.
export const clashDisplay = localFont({
  src: [
    { path: "../public/fonts/clash-display-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/clash-display-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-clash-display",
  display: "swap",
  fallback: ["sans-serif"],
})

export const satoshi = localFont({
  src: [
    { path: "../public/fonts/satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/satoshi-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
  fallback: ["sans-serif"],
})

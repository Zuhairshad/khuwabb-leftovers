import type { Metadata } from "next"
import { Exchange } from "@/components/info/Exchange"
import { absoluteUrl } from "@/lib/site"

const TITLE = "7-day exchange · Khuwabb"
const DESCRIPTION = "Wrong size or not quite right? Message Khuwabb within 7 days of your order arriving and we will swap it. How exchanges work, what can be exchanged and how to get in touch."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/exchange" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/exchange",
    siteName: "Khuwabb",
    locale: "en_PK",
    images: [{ url: absoluteUrl("/brand/collections.jpg") }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [absoluteUrl("/brand/collections.jpg")] },
}

export default function ExchangePage() {
  return <Exchange />
}

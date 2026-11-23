import type { Metadata } from "next"
import { NewInPage } from "@/components/new-in/NewInPage"
import { absoluteUrl } from "@/lib/site"

const TITLE = "New arrivals · Khuwabb"
const DESCRIPTION = "The latest Khuwabb drops, fresh in this week."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/new-in" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/new-in",
    siteName: "Khuwabb",
    locale: "en_PK",
    images: [{ url: absoluteUrl("/brand/wear-the-dream.jpg") }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [absoluteUrl("/brand/wear-the-dream.jpg")] },
}

export default function Page() {
  return <NewInPage />
}

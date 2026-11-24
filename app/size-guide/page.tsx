import type { Metadata } from "next"
import { SizeGuide } from "@/components/size-guide/SizeGuide"
import { absoluteUrl } from "@/lib/site"

const TITLE = "Size guide · Khuwabb"
const DESCRIPTION = "Measurements for every Khuwabb piece in centimetres and inches: trousers, joggers, co-ord sets, dresses and jackets, with how we measure and how numeric sizes map to S, M, L and XL."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/size-guide" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/size-guide",
    siteName: "Khuwabb",
    locale: "en_PK",
    images: [{ url: absoluteUrl("/brand/collections.jpg") }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [absoluteUrl("/brand/collections.jpg")] },
}

export default function SizeGuidePage() {
  return <SizeGuide />
}

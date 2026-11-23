import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { Footer } from "@/components/Footer"
import { MotionProvider } from "@/components/MotionProvider"
import { Nav } from "@/components/Nav"
import { ScoopIntro } from "@/components/ScoopIntro"
import { absoluteUrl, SITE_URL } from "@/lib/site"
import { clashDisplay, satoshi } from "./fonts"
import "./globals.css"

const TITLE = "Khuwabb · Women's pret & couture"
const DESCRIPTION = "Clothes that feel like a dream you never want to wake up from. Born in Lahore."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "Khuwabb",
    locale: "en_PK",
    images: [{ url: absoluteUrl("/brand/wear-the-dream.jpg") }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [absoluteUrl("/brand/wear-the-dream.jpg")],
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${clashDisplay.variable} ${satoshi.variable}`}>
      <body>
        <MotionProvider>
          <Nav />
          <main>{children}</main>
          <Footer />
        </MotionProvider>
        {/* Every page opens with the slot-machine intro. */}
        <ScoopIntro />
      </body>
    </html>
  )
}

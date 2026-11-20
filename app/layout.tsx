import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { Footer } from "@/components/Footer"
import { MotionProvider } from "@/components/MotionProvider"
import { Nav } from "@/components/Nav"
import { ScoopIntro } from "@/components/ScoopIntro"
import { clashDisplay, satoshi } from "./fonts"
import "./globals.css"

export const metadata: Metadata = {
  title: "Khuwabb · Women's pret & couture",
  description: "Clothes that feel like a dream you never want to wake up from. Born in Lahore.",
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

import { CareLabels } from "@/components/home/CareLabels"
import { Flavours } from "@/components/home/Flavours"
import { FreshDaily } from "@/components/home/FreshDaily"
import { Hero } from "@/components/home/Hero"
import { InstagramFeed } from "@/components/home/InstagramFeed"
import { Looks } from "@/components/home/Looks"
import { NewIn } from "@/components/home/NewIn"
import { Receipts } from "@/components/home/Receipts"
import { SaleMarquee } from "@/components/home/SaleMarquee"
import { jsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/jsonld"

// Re-rendered at most every 15 minutes so new Instagram posts show up
// (see lib/instagram.ts).
export const revalidate = 900

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteJsonLd()) }} />
      <Hero />
      <SaleMarquee />
      <Flavours />
      <NewIn />
      <FreshDaily />
      <Looks />
      <Receipts />
      <CareLabels />
      <InstagramFeed />
    </>
  )
}

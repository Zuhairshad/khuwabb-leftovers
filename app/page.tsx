import { CareLabels } from "@/components/home/CareLabels"
import { Flavours } from "@/components/home/Flavours"
import { FreshDaily } from "@/components/home/FreshDaily"
import { Hero } from "@/components/home/Hero"
import { Looks } from "@/components/home/Looks"
import { NewIn } from "@/components/home/NewIn"
import { Receipts } from "@/components/home/Receipts"

export default function Home() {
  return (
    <>
      <Hero />
      <Flavours />
      <NewIn />
      <FreshDaily />
      <Looks />
      <Receipts />
      <CareLabels />
    </>
  )
}

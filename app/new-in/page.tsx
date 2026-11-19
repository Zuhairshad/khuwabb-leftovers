import type { Metadata } from "next"
import { NewInPage } from "@/components/new-in/NewInPage"

export const metadata: Metadata = { title: "New arrivals · Khuwabb" }

export default function Page() {
  return <NewInPage />
}

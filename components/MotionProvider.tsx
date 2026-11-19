"use client"

import { LazyMotion } from "framer-motion"
import type { ReactNode } from "react"

// framer-motion's animation features load in their own chunk after first
// paint instead of in every page's initial bundle. domMax (not domAnimation)
// because the nav pill animates `layout` and the receipts use `drag`.
const features = () => import("./motionFeatures").then((mod) => mod.default)

export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={features}>{children}</LazyMotion>
}

"use client"

import { m, type Transition } from "framer-motion"
import type { CSSProperties, ReactNode } from "react"

// Scroll-in effect that replays: hidden until `amount` of the element is in
// view, then animates to rest; animates back out when it leaves.
type Pose = { opacity?: number; x?: number; y?: number; scale?: number; rotate?: number }

const REST = { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }

export const presets = {
  // Section titles.
  rise: { from: { opacity: 0, y: 40 }, transition: { delay: 0.1, duration: 1.1, ease: [0.22, 1, 0.36, 1] }, amount: 0.3 },
  // Large blocks (card rows).
  lift: { from: { opacity: 0, y: 80, scale: 0.98 }, transition: { duration: 1.4, ease: [0.22, 1, 0.36, 1] }, amount: 0.2 },
} satisfies Record<string, { from: Pose; transition: Transition; amount: number }>

type Props = {
  preset?: keyof typeof presets
  from?: Pose
  transition?: Transition
  amount?: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
  as?: "div" | "section"
} & Record<`data-${string}`, string | boolean | undefined>

export function Appear({ preset = "rise", from, transition, amount, className, style, children, as = "div", ...rest }: Props) {
  const p = presets[preset]
  const t = transition ?? p.transition
  // Only the properties the pose changes are animated, so an element's own
  // resting transform (e.g. a tilt in `style`) is left alone.
  const hiddenPose = from ?? p.from
  const restPose = Object.fromEntries(Object.keys(hiddenPose).map((k) => [k, REST[k as keyof typeof REST]]))
  const variants = {
    hidden: { ...hiddenPose, transition: t },
    shown: { ...restPose, transition: t },
  }
  const Tag = as === "section" ? m.section : m.div
  return (
    <Tag className={className} style={style} variants={variants} initial="hidden" animate="hidden" whileInView="shown" viewport={{ amount: amount ?? p.amount }} {...rest}>
      {children}
    </Tag>
  )
}

"use client"

import { m } from "framer-motion"
import type { ReactNode } from "react"
import styles from "./CareLabels.module.css"

// Store promises as woven care labels; each tumbles in and straightens on hover.
const ICON = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const

const Truck = (
  <>
    <path {...ICON} d="M 0 0 L 3.992 0 C 4.298 0 4.573 0.185 4.688 0.469 L 6 3.75" transform="translate(17.25 7.5)" />
    <path {...ICON} d="M 0 0 L 15 0" transform="translate(2.25 13.5)" />
    <path {...ICON} d="M 0 2.25 C 0 1.007 1.007 0 2.25 0 C 3.493 0 4.5 1.007 4.5 2.25 C 4.5 3.493 3.493 4.5 2.25 4.5 C 1.007 4.5 0 3.493 0 2.25 Z" transform="translate(15.75 15.75)" />
    <path {...ICON} d="M 0 2.25 C 0 1.007 1.007 0 2.25 0 C 3.493 0 4.5 1.007 4.5 2.25 C 4.5 3.493 3.493 4.5 2.25 4.5 C 1.007 4.5 0 3.493 0 2.25 Z" transform="translate(5.25 15.75)" />
    <path {...ICON} d="M 6 0 L 0 0" transform="translate(9.75 18)" />
    <path {...ICON} d="M 0 0 L 6 0 L 6 6 C 6 6.414 5.664 6.75 5.25 6.75 L 3 6.75" transform="translate(17.25 11.25)" />
    <path {...ICON} d="M 3 12 L 0.75 12 C 0.336 12 0 11.664 0 11.25 L 0 0.75 C 0 0.336 0.336 0 0.75 0 L 15 0 L 15 9.878" transform="translate(2.25 6)" />
  </>
)

const Returns = (
  <>
    <path {...ICON} d="M 0 0 L 0 4.5 L 4.5 4.5" transform="translate(2.25 5.25)" />
    <path {...ICON} d="M 4.087 14.25 C 7.378 17.356 12.556 17.231 15.694 13.97 C 18.832 10.709 18.757 5.53 15.527 2.361 C 12.296 -0.808 7.116 -0.784 3.916 2.416 L 0 6" transform="translate(2.25 3.75)" />
  </>
)

const Needle = (
  <>
    <path {...ICON} d="M 1.5 0 L 0 1.5" transform="translate(15.75 6.75)" />
    <path {...ICON} d="M 13.372 7.372 L 15.622 5.122 C 16.793 3.95 16.793 2.05 15.622 0.879 C 14.45 -0.293 12.55 -0.293 11.378 0.879 L 9.128 3.129 C 8.25 8.25 0 16.5 0 16.5 C 0 16.5 8.25 8.25 13.372 7.372 Z" transform="translate(3.75 3.75)" />
  </>
)

const Leaf = (
  <>
    <path {...ICON} d="M 1.482 14.268 C -3.008 6.786 2.982 -0.696 15.698 0.052 C 16.446 12.772 8.964 18.758 1.482 14.268 Z" transform="translate(4.5 3.75)" />
    <path {...ICON} d="M 11.25 0 L 0 11.25" transform="translate(3.75 9)" />
  </>
)

const LABELS: { text: string; icon: ReactNode; tilt: number; delay: number }[] = [
  { text: "Born in Lahore", icon: Leaf, tilt: -2, delay: 0.1 },
  { text: "Custom stitching", icon: Needle, tilt: 2, delay: 0.22 },
  { text: "7-day exchange", icon: Returns, tilt: -2, delay: 0.34 },
  { text: "Cash on delivery", icon: Truck, tilt: 2, delay: 0.46 },
]

export function CareLabels() {
  return (
    <section className={styles.section} data-section="care-labels">
      {LABELS.map((l, i) => {
        const t = { type: "spring", bounce: 0.3, duration: 1.2, delay: l.delay } as const
        const enter = i % 2 === 0 ? -8 : 8
        return (
          <m.div
            key={l.text}
            className={styles.label}
            variants={{
              hidden: { opacity: 0, y: 30, rotate: enter, scale: 1, transition: t },
              shown: { opacity: 1, y: 0, rotate: l.tilt, scale: 1, transition: t },
              hover: { opacity: 1, y: 0, rotate: 0, scale: 1.04, transition: { type: "spring", bounce: 0.4, duration: 0.6 } },
            }}
            initial="hidden"
            animate="hidden"
            whileInView="shown"
            whileHover="hover"
            viewport={{ amount: 0.3 }}
          >
            <div className={styles.stitch}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                {l.icon}
              </svg>
              <p>{l.text}</p>
            </div>
          </m.div>
        )
      })}
    </section>
  )
}

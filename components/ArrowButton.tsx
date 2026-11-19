"use client"

import { m } from "framer-motion"
import styles from "./ArrowButton.module.css"

// Pill link with a round arrow badge that turns 45° on hover.
export function ArrowButton({ href, label, tone = "dark" }: { href: string; label: string; tone?: "dark" | "light" }) {
  return (
    <m.a href={href} className={styles.button} data-tone={tone} initial="rest" whileHover="hover" animate="rest">
      <span className={styles.label}>{label}</span>
      <m.span className={styles.icon} variants={{ rest: { rotate: 0 }, hover: { rotate: 45 } }} transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}>
        <ArrowUpRight />
      </m.span>
    </m.a>
  )
}

export function ArrowUpRight({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 18L13.125 10.875" />
      <path d="M8.25 6H18V15.75Z" />
    </svg>
  )
}

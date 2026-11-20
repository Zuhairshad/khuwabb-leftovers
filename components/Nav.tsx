"use client"

import { AnimatePresence, m } from "framer-motion"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { skipsIntro } from "@/lib/intro"
import { BagButton } from "./Bag"
import styles from "./Nav.module.css"

const LINKS = [
  { label: "Shop", href: "/shop" },
  { label: "New in", href: "/new-in" },
  { label: "Lookbook", href: "/#looks" },
]

// Framer's variant switch: spring, bounce 0.1, 0.6s.
const SPRING = { type: "spring", bounce: 0.1, duration: 0.6 } as const

export function Nav({ delay = 3.3 }: { delay?: number }) {
  const [open, setOpen] = useState(false)
  // Without the intro there's nothing to wait for: the nav is simply there.
  const instant = skipsIntro(usePathname())

  return (
    <m.div
      className={styles.nav}
      data-section="nav"
      initial={instant ? false : { opacity: 0.001, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      <m.div className={styles.pill} data-open={open || undefined} layout transition={SPRING}>
        <div className={styles.bar}>
          <a href="/" className={styles.logo} aria-label="Khuwabb leftover — home">
            <img src="/brand/logo-162h.webp" alt="" width={231} height={162} />
            <span>leftover</span>
          </a>
          <nav className={styles.links} aria-label="Main">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className={styles.actions}>
            <a href="/search" className={styles.search} aria-label="Search">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <circle cx="10.5" cy="10.5" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M15.803 15.803L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </a>
            <BagButton />
            <button
              type="button"
              className={styles.menu}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              data-menu-toggle
            >
              <m.span className={styles.line} animate={open ? { top: 21, rotate: 45 } : { top: 17, rotate: 0 }} transition={SPRING} />
              <m.span className={styles.line} animate={open ? { top: 21, rotate: -45 } : { top: 25, rotate: 0 }} transition={SPRING} />
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <m.nav
              className={styles.drawer}
              aria-label="Mobile"
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={SPRING}
            >
              <div className={styles.drawerInner}>
                {LINKS.map((l) => (
                  <a key={l.href} href={l.href}>
                    {l.label}
                  </a>
                ))}
              </div>
            </m.nav>
          )}
        </AnimatePresence>
      </m.div>
    </m.div>
  )
}

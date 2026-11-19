"use client"

import { m } from "framer-motion"
import curtain from "@/data/fitting-curtain.json"
import { FittingCurtain } from "./FittingCurtain"
import { NewsletterForm } from "./NewsletterForm"
import styles from "./Footer.module.css"

const EMAIL = "khuwabb@gmail.com"

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "All collections", href: "/shop" },
      { label: "New in", href: "/new-in" },
      { label: "Lookbook", href: "/#looks" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Size guide", href: `mailto:${EMAIL}?subject=Size%20guide` },
      { label: "7-day exchange", href: `mailto:${EMAIL}?subject=Exchange` },
      { label: EMAIL, href: `mailto:${EMAIL}` },
    ],
  },
  {
    title: "Khuwabb",
    links: [
      { label: "Born in Lahore", href: "/" },
      { label: "Delivery across Pakistan", href: "/shop" },
      { label: "Cash on delivery", href: "/shop" },
    ],
  },
]

const SOCIAL = [
  { name: "Instagram", href: "https://instagram.com", icon: "/icons/instagram.svg" },
  { name: "Tiktok", href: "https://tiktok.com", icon: "/icons/tiktok.svg" },
  { name: "Pinterest", href: "https://pinterest.com", icon: "/icons/pinterest.svg" },
]

const mask = (url: string) => ({ WebkitMaskImage: `url(${url})`, maskImage: `url(${url})` })

export function Footer() {
  return (
    <footer className={styles.footer} data-section="footer">
      <div className={styles.newsletter}>
        <h1 className={styles.title}>Dressed in dreams</h1>
        <p className={styles.lede}>Clothes that feel like a dream you never want to wake up from. New drops every week — hear about them first.</p>
        <div className={styles.form}>
          <NewsletterForm />
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.columns}>
          {COLUMNS.map((col) => (
            <div key={col.title} className={styles.column}>
              <p className={styles.heading}>{col.title}</p>
              {col.links.map((l) => (
                <p key={l.label} className={styles.link}>
                  <a href={l.href}>{l.label}</a>
                </p>
              ))}
            </div>
          ))}
          <div className={styles.follow}>
            {SOCIAL.map((s) => (
              <m.a
                key={s.name}
                href={s.href}
                aria-label={s.name}
                className={styles.social}
                whileHover={{ backgroundColor: "rgba(247, 243, 236, 0.18)" }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={styles.icon} style={mask(s.icon)} />
              </m.a>
            ))}
          </div>
        </div>
        <div className={styles.legal}>
          <p>© 2026 Khuwabb. Born in Lahore.</p>
        </div>
      </div>

      <div className={styles.curtain}>
        <FittingCurtain {...curtain} />
      </div>
    </footer>
  )
}

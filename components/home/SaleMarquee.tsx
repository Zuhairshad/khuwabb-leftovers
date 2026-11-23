import Link from "next/link"
import styles from "./SaleMarquee.module.css"

export function SaleMarquee() {
  return (
    <Link href="/shop" className={styles.banner} aria-label="Shop export factory leftovers, 20% off">
      <span className={styles.staticMessage} aria-hidden="true">20% off · Export factory leftovers</span>
      <span className={styles.track} aria-hidden="true">
        {[0, 1].map((copy) => (
          <span className={styles.group} key={copy}>
            {[0, 1, 2, 3, 4].map((item) => (
              <span className={styles.message} key={item}>
                <strong>20% off</strong>
                <span className={styles.dot}>✦</span>
                <span>Export factory leftovers</span>
                <span className={styles.dot}>✦</span>
              </span>
            ))}
          </span>
        ))}
      </span>
    </Link>
  )
}

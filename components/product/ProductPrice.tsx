import { formatPrice } from "@/lib/format"
import styles from "./ProductPrice.module.css"

export function ProductPrice({ price, compareAt }: { price: number | null; compareAt: number | null }) {
  if (price === null) return null

  return (
    <span className={styles.prices}>
      {compareAt !== null && compareAt > price && (
        <s className={styles.original} aria-label={`Original price ${formatPrice(compareAt)}`}>
          {formatPrice(compareAt)}
        </s>
      )}
      <span>{formatPrice(price)}</span>
    </span>
  )
}

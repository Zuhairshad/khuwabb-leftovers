"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { changeQty, formatPrice, onBagOpen, useBag } from "@/lib/bag"
import { checkoutFor } from "@/lib/checkout"
import styles from "./Bag.module.css"
import { atLeast } from "@/lib/img"

// No free-delivery threshold published yet; the meter shows when this is set.
const FREE_OVER = 0
const EMPTY_IMAGE = "/framer/images/YiUnZTXr74PD1drE1Th6MZvyUj4.1i1xfkl.png"

export function BagButton() {
  const items = useBag()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [bump, setBump] = useState(false)
  const count = items.reduce((n, i) => n + i.qty, 0)
  const lastCount = useRef(count)

  useEffect(() => {
    setMounted(true)
    return onBagOpen(() => setOpen(true))
  }, [])

  // Pop the badge whenever something is added.
  useEffect(() => {
    if (count > lastCount.current) {
      setBump(true)
      const t = setTimeout(() => setBump(false), 600)
      lastCount.current = count
      return () => clearTimeout(t)
    }
    lastCount.current = count
  }, [count])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      root.style.overflow = previous
    }
  }, [open])

  return (
    <>
      <button type="button" className={styles.button} data-code-component onClick={() => setOpen(true)} aria-label={`Bag, ${count} items`} data-bag-button>
        Bag
        <span className={styles.badge} data-bump={bump || undefined}>
          {count}
        </span>
      </button>
      {mounted && createPortal(<BagDrawer open={open} onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}

function BagDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = useBag()
  const count = items.reduce((n, i) => n + i.qty, 0)
  const subtotal = items.reduce((n, i) => n + (i.orderable ? i.qty * (i.price ?? 0) : 0), 0)
  const checkout = checkoutFor(items)
  const remaining = Math.max(0, FREE_OVER - subtotal)
  const progress = Math.min(1, subtotal / FREE_OVER)

  return (
    <div className={styles.layer} data-code-component data-open={open || undefined} data-bag-drawer>
      <div className={styles.scrim} onClick={onClose} />
      <aside className={styles.panel} role="dialog" aria-label="Your bag">
        <div className={styles.head}>
          <div className={styles.title}>
            Your bag <span className={styles.count}>{count > 0 ? count : ""}</span>
          </div>
          <button type="button" aria-label="Close" className={styles.close} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" stroke="#17140F" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {FREE_OVER > 0 && (
        <div className={styles.meter}>
          <div className={styles.meterLabel}>
            {remaining > 0 ? (
              <>
                <b>{formatPrice(remaining)}</b> away from free delivery
              </>
            ) : (
              <b>Free delivery unlocked</b>
            )}
          </div>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        )}

        <div className={styles.list}>
          {items.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyArch}>
                <img src={atLeast(EMPTY_IMAGE, 300)} alt="" loading="lazy" decoding="async" />
              </div>
              <div className={styles.emptyText}>Your bag is empty.</div>
              <a href="/shop" className={styles.emptyCta} onClick={onClose}>
                Start shopping
              </a>
            </div>
          )}
          {items.map((item, index) => (
            <div key={item.id} className={styles.line} style={{ ["--i" as string]: index }}>
              <div className={styles.thumb}>{item.image && <img src={atLeast(item.image, 300)} alt={item.name} loading="lazy" decoding="async" />}</div>
              <div className={styles.lineBody}>
                <div>
                  <div className={styles.lineTop}>
                    <span>{item.name}</span>
                    <span className={styles.num}>{item.price === null ? "" : formatPrice(item.price * item.qty)}</span>
                  </div>
                  <div className={styles.size}>
                    {item.colour} · Size {item.size}
                  </div>
                  {!item.orderable && <div className={styles.unavailable}>Not available to order</div>}
                </div>
                <div className={styles.lineBottom}>
                  <div className={styles.stepper}>
                    <button type="button" aria-label="One less" onClick={() => changeQty(item.id, -1)}>
                      −
                    </button>
                    <span>{item.qty}</span>
                    <button type="button" aria-label="One more" disabled={!item.orderable} onClick={() => changeQty(item.id, 1)}>
                      +
                    </button>
                  </div>
                  <button type="button" className={styles.remove} onClick={() => changeQty(item.id, -item.qty)}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className={styles.foot}>
            <div className={styles.subtotal}>
              <span>Subtotal</span>
              <span className={styles.num}>{formatPrice(subtotal)}</span>
            </div>
            <div className={styles.note} data-checkout-note>
              {checkout.ready ? "Cash on delivery. Delivery charges are shown at checkout." : checkout.reason}
            </div>
            <a
              className={styles.checkout}
              href={checkout.ready ? checkout.url : undefined}
              aria-disabled={!checkout.ready || undefined}
              data-checkout
              onClick={(e) => !checkout.ready && e.preventDefault()}
            >
              Checkout
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        )}
      </aside>
    </div>
  )
}

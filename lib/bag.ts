"use client"

import { useEffect, useState } from "react"
import { canOrder, getProduct, photo, type Product } from "./catalog"

export { formatPrice } from "./format"

// The bag lives in localStorage so every page (and tab) shares it. It stores
// only what was chosen (product, colour, size, qty); name, price, photo and
// whether it can still be ordered always come from the catalog, so a stale
// bag can never carry an old price or an unavailable variant to checkout.
const KEY = "khuwabb-bag"
const CHANGE = "khuwabb-bag-change"
const OPEN = "khuwabb-bag-open"

export type BagEntry = { slug: string; colour: string; size: string; qty: number }
export type BagLine = BagEntry & {
  id: string
  product: Product | undefined
  name: string
  price: number | null
  image: string
  orderable: boolean
  shopifyId: string | null
}

const lineId = (e: Pick<BagEntry, "slug" | "colour" | "size">) => `${e.slug}|${e.colour}|${e.size}`

export function readBag(): BagEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]")
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e) => e && typeof e.slug === "string" && typeof e.colour === "string" && typeof e.size === "string" && Number.isInteger(e.qty) && e.qty > 0,
    )
  } catch {
    return []
  }
}

function writeBag(items: BagEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {}
  window.dispatchEvent(new CustomEvent(CHANGE))
}

/** Adds variants; anything the catalog can't sell is refused. Returns how many were added. */
export function addToBag(pieces: Omit<BagEntry, "qty">[], open = true) {
  const items = readBag()
  let added = 0
  for (const piece of pieces) {
    if (!canOrder(getProduct(piece.slug), piece.colour, piece.size)) continue
    const existing = items.find((i) => lineId(i) === lineId(piece))
    if (existing) existing.qty += 1
    else items.push({ ...piece, qty: 1 })
    added++
  }
  if (added) writeBag(items)
  if (added && open) openBag()
  return added
}

export function changeQty(id: string, delta: number) {
  writeBag(
    readBag()
      .map((i) => (lineId(i) === id ? { ...i, qty: i.qty + delta } : i))
      .filter((i) => i.qty > 0),
  )
}

export function clearBag() {
  writeBag([])
}

export function openBag() {
  window.dispatchEvent(new CustomEvent(OPEN))
}

export function onBagOpen(fn: () => void) {
  window.addEventListener(OPEN, fn)
  return () => window.removeEventListener(OPEN, fn)
}

export function toLine(e: BagEntry): BagLine {
  const product = getProduct(e.slug)
  const orderable = canOrder(product, e.colour, e.size)
  return {
    ...e,
    id: lineId(e),
    product,
    name: product?.name ?? "No longer available",
    price: product?.price ?? null,
    image: product ? photo(product, e.colour).src : "",
    orderable,
    shopifyId: orderable ? product!.variants[`${e.colour} / ${e.size}`].shopifyId : null,
  }
}

export function useBag(): BagLine[] {
  const [items, setItems] = useState<BagLine[]>([])
  useEffect(() => {
    const sync = () => setItems(readBag().map(toLine))
    sync()
    window.addEventListener(CHANGE, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(CHANGE, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])
  return items
}

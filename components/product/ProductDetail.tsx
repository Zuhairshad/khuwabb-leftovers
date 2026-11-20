"use client"

import { useEffect, useState } from "react"
import { addToBag } from "@/lib/bag"
import { canOrder, getProduct, photo, type View } from "@/lib/catalog"
import { formatPrice } from "@/lib/format"
import styles from "./ProductDetail.module.css"
import { atLeast, responsive } from "@/lib/img"

// One editable page for every catalog product. Colour swaps the photo; a size
// can be added only when that exact variant is confirmed orderable.
export function ProductDetail({ slug }: { slug: string }) {
  const p = getProduct(slug)!
  const [colour, setColour] = useState(p.colours[0]?.name ?? "")
  // Links from looks and the outfit reels name a colour: ?colour=Red
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("colour")
    if (wanted && p.colours.some((c) => c.name === wanted)) setColour(wanted)
  }, [p])
  const [size, setSize] = useState("")
  const [added, setAdded] = useState(false)
  const [view, setView] = useState<View>("front")
  const shot = photo(p, colour)
  const views = (["front", "side", "back"] as View[]).filter((v) => shot.views[v])
  const src = shot.views[view] ?? shot.src
  const orderableHere = p.sizes.some((s) => canOrder(p, colour, s))
  const ready = !!size && canOrder(p, colour, size)
  const facts = [
    ["Description", p.details.description],
    ["Fabric", p.details.fabric],
    ["Care", p.details.care],
    ["Size guide", p.details.sizeChart],
  ].filter((f): f is [string, string] => !!f[1])

  return (
    <article className={styles.page} data-section="product" data-product={p.slug}>
      <div className={styles.media}>
        <div className={styles.gallery} style={{ background: p.tint }}>
          <img key={src} {...responsive(src)} sizes="(max-width: 809px) 70vw, 440px" fetchPriority="high" alt={`${p.name} in ${colour}, ${view} view`} />
        </div>
        {views.length > 1 && (
          <div className={styles.views} role="group" aria-label="Photos">
            {views.map((v) => (
              <button key={v} type="button" aria-pressed={v === view} aria-label={`${v} view`} onClick={() => setView(v)} style={{ background: p.tint }}>
                <img src={atLeast(shot.views[v]!, 150)} alt="" decoding="async" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.info}>
        <p className={styles.category}>{p.soldAs === "set" ? (p.category === "Gymwear" ? "Gymwear · top and leggings, sold as a set" : "Co-ord set · top and bottom") : p.category}</p>
        <h1 className={styles.name}>{p.name}</h1>
        <p className={styles.price}>
          {formatPrice(p.price)}
          {typeof p.compareAt === "number" && typeof p.price === "number" && p.compareAt > p.price && <s>{formatPrice(p.compareAt)}</s>}
        </p>

        <fieldset className={styles.group}>
          <legend>
            Colour <b>{colour}</b>
          </legend>
          <div className={styles.options}>
            {p.colours.map((c) => (
              <button
                key={c.name}
                type="button"
                className={styles.option}
                aria-pressed={c.name === colour}
                onClick={() => {
                  setColour(c.name)
                  setAdded(false)
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Size</legend>
          {p.sizes.length === 0 && <p className={styles.note}>Sizes coming soon.</p>}
          <div className={styles.options}>
            {p.sizes.map((s) => (
              <button
                key={s}
                type="button"
                className={styles.option}
                aria-pressed={s === size}
                data-unavailable={!canOrder(p, colour, s) || undefined}
                onClick={() => {
                  setSize(s)
                  setAdded(false)
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          className={styles.add}
          disabled={!ready}
          data-add-to-bag
          onClick={() => setAdded(addToBag([{ slug: p.slug, colour, size }]) > 0)}
        >
          {!orderableHere ? "Sold out in this colour" : !size ? "Choose a size" : ready ? (added ? "Added. Add another" : "Add to bag") : "Sold out in this size"}
        </button>
        {!orderableHere && (
          <p className={styles.note}>
            This colour is sold out right now. Message{" "}
            <a href="mailto:khuwabb@gmail.com">khuwabb@gmail.com</a> to ask about a restock.
          </p>
        )}

        {facts.length > 0 && (
          <dl className={styles.facts}>
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  )
}

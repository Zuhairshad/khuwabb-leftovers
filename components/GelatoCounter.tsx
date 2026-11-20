"use client"

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react"
import { atLeast, responsive } from "@/lib/img"
import styles from "./GelatoCounter.module.css"
import { LaterImg } from "./LaterImg"

// Campaign photo that opens up as it scrolls into view, with a tag per
// flavour placed on the photo. Hovering, focusing or tapping a tag shows that
// flavour's look card; while idle the cards cycle on a timer.

export type CounterFlavour = {
  name: string
  color: string
  note: string
  price: string
  link: string
  x: number
  y: number
  image1: string
  image2: string
  image3: string
}

type Props = {
  image: string
  imageAlt: string
  flavours: CounterFlavour[]
  cta?: string
  radius?: number
  focusX?: number
  cycle?: number
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function GelatoCounter({ image, imageAlt, flavours, cta = "Shop the look", radius = 32, focusX = 50, cycle = 4 }: Props) {
  const frame = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 1200, h: 700 })
  const [natural, setNatural] = useState({ w: 1536, h: 864 })
  const [reveal, setReveal] = useState(0)
  const [active, setActive] = useState(0)
  const [hovering, setHovering] = useState(false)
  const [onScreen, setOnScreen] = useState(false)
  const narrow = box.w < 700
  const revealed = reveal > 0.92

  useEffect(() => {
    const el = frame.current
    if (!el) return
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setBox({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Eased scroll progress: 0 as the photo enters, 1 once it is 85% of a
  // viewport up the screen.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setReveal(1)
      return
    }
    let raf = 0
    let eased = 0
    const loop = () => {
      const el = frame.current
      if (el) {
        const r = el.getBoundingClientRect()
        const vh = window.innerHeight
        const target = clamp((vh - r.top) / (vh * 0.85), 0, 1)
        eased += (target - eased) * 0.08
        if (Math.abs(target - eased) < 0.001) eased = target
        setReveal((v) => (Math.abs(v - eased) > 5e-4 ? eased : v))
        setOnScreen(r.bottom > 0 && r.top < vh)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (hovering || !revealed || !onScreen || flavours.length < 2) return
    const t = setInterval(() => setActive((i) => (i + 1) % flavours.length), Math.max(2, cycle) * 1000)
    return () => clearInterval(t)
  }, [hovering, revealed, onScreen, flavours.length, cycle])

  // Cover-fit the photo inside the frame, anchored horizontally at focusX.
  const scale = Math.max(box.w / natural.w, box.h / natural.h)
  const imgW = natural.w * scale
  const imgH = natural.h * scale
  const imgX = (box.w - imgW) * (clamp(focusX, 0, 100) / 100)
  const imgY = (box.h - imgH) / 2
  const at = (f: CounterFlavour) => ({ x: imgX + (clamp(f.x, 0, 100) / 100) * imgW, y: imgY + (clamp(f.y, 0, 100) / 100) * imgH })

  const p = 1 - (1 - reveal) ** 3
  const side = (1 - p) * (narrow ? 0.08 : 0.2) * box.w
  const inner = box.w - side * 2
  const round = inner / 2 + (radius - inner / 2) * p
  const clip = `inset(0px ${side.toFixed(1)}px 0px ${side.toFixed(1)}px round ${round.toFixed(1)}px ${round.toFixed(1)}px ${radius}px ${radius}px)`
  const cardWidth = narrow ? box.w : Math.min(320, box.w - 32)

  const tag = (f: CounterFlavour, i: number) => {
    const on = i === active
    const pos = at(f)
    const style: CSSProperties = narrow
      ? { position: "relative", opacity: revealed ? 1 : 0, transitionDelay: `0s, ${(i * 0.08).toFixed(2)}s, 0s, 0s` }
      : {
          position: "absolute",
          left: pos.x,
          top: pos.y,
          transform: `translate(-50%, -100%) translateY(${on ? -8 : 0}px) rotate(${on ? 0 : i % 2 === 0 ? -4 : 3}deg)`,
          opacity: revealed ? 1 : 0,
          transitionDelay: `0s, ${(i * 0.08).toFixed(2)}s, 0s, 0s`,
        }
    return (
      <button
        key={f.name}
        type="button"
        className={styles.tag}
        data-on={on || undefined}
        aria-label={f.name}
        style={style}
        onMouseEnter={() => {
          setHovering(true)
          setActive(i)
        }}
        onFocus={() => setActive(i)}
        onClick={() => setActive(i)}
      >
        <span className={styles.dot} style={{ background: f.color }} />
        {f.name}
      </button>
    )
  }

  const card = (f: CounterFlavour) => (
    <div className={styles.card} data-narrow={narrow || undefined} style={{ width: cardWidth }}>
      <div className={styles.pieces}>
        {[f.image1, f.image2, f.image3].map((src, i) => (
          <div key={i} className={styles.tile} style={{ background: f.color }}>
            {src && <LaterImg src={atLeast(src, 300)} alt="" loading="lazy" decoding="async" />}
          </div>
        ))}
      </div>
      <div className={styles.copy}>
        <div className={styles.name}>{f.name}</div>
        {f.note && <div className={styles.note}>{f.note}</div>}
      </div>
      <div className={styles.buy}>
        <span className={styles.price}>{f.price}</span>
        <a href={f.link || "#"} className={styles.cta}>
          {cta}
          <span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M4 10L10 4M5 4h5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </a>
      </div>
    </div>
  )

  return (
    <div className={styles.root} data-code-component onMouseLeave={() => setHovering(false)}>
      <div ref={frame} className={styles.frame}>
        <div className={styles.clip} style={{ clipPath: clip, WebkitClipPath: clip }}>
          <LaterImg
            {...responsive(image)}
            sizes="(max-width: 809px) 200vw, 1216px"
            loading="lazy"
            decoding="async"
            alt={imageAlt}
            className={styles.photo}
            onLoad={(e) => {
              const t = e.currentTarget
              if (t.naturalWidth) setNatural({ w: t.naturalWidth, h: t.naturalHeight })
            }}
            style={{ left: imgX, top: imgY, width: imgW, height: imgH, transform: `scale(${(1.08 - 0.08 * p).toFixed(4)})` }}
          />
        </div>
        {!narrow && (
          <>
            {flavours.map((f, i) => (
              <Fragment key={f.name}>{tag(f, i)}</Fragment>
            ))}
            {flavours.map((f, i) => {
              const shown = i === active && revealed
              const pos = at(f)
              const left = clamp(pos.x - cardWidth / 2, 16, box.w - cardWidth - 16)
              return (
                <div
                  key={`card-${f.name}`}
                  className={styles.float}
                  data-shown={shown || undefined}
                  style={{ left, bottom: box.h - pos.y + 64, transformOrigin: `${pos.x - left}px 100%` }}
                  onMouseEnter={() => setHovering(true)}
                >
                  {card(f)}
                </div>
              )
            })}
          </>
        )}
      </div>
      {narrow && flavours.length > 0 && (
        <>
          <div className={styles.chips}>{flavours.map(tag)}</div>
          {card(flavours[active] ?? flavours[0])}
        </>
      )}
    </div>
  )
}

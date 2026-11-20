"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react"
import { addToBag, formatPrice } from "@/lib/bag"
import { canOrder, getProduct } from "@/lib/catalog"
import styles from "./ScoopReels.module.css"

// Three horizontal reels (tops, bottoms, shoes) of cut-out pieces on a curved
// track. Rows can be dragged or tapped; Shuffle spins them to a new outfit and
// steps the flavour backdrop. Everything moves from one rAF loop that writes
// transforms straight to the DOM.

// `id` is the catalog slug; size and colour are chosen when adding the look.
export type Piece = { id: string; name: string; price?: number | null; image: string; srcSet?: string; fit: "any" | "men" | "women" }
export type Flavour = { name: string; color: string }
type Row = "tops" | "bottoms" | "shoes"

export type ReelsConfig = {
  tops: Piece[]
  bottoms: Piece[]
  shoes: Piece[]
  flavours: Flavour[]
  autoShuffle: number
  intro: boolean
  introDelay: number
  curve: number
  lookScale: number
  sideBlur: number
  spacing: number
  topInset: number
  topSpace: number
  topSpaceMobile: number
}

const ROWS: Row[] = ["tops", "bottoms", "shoes"]
const SPIN_DIR: Record<Row, number> = { tops: 1, bottoms: -1, shoes: 1 }
const MOBILE = 640

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const backOut = (t: number, s = 0.9) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2
const cubicOut = (t: number) => 1 - (1 - t) ** 3
// Signed distance on a ring of n slots, in (-n/2, n/2].
const wrap = (d: number, n: number) => {
  let r = ((d % n) + n) % n
  if (r >= n / 2) r -= n
  return r
}

// Kept as a named function so visual tests can seed the shuffle.
function reelsRandom() {
  return Math.random()
}

function darken(color: string, amount: number) {
  const m = /rgba?\(([^)]+)\)/.exec(color)
  const [r, g, b] = m ? m[1].split(",").map(parseFloat) : [240, 236, 228]
  const f = (v: number) => Math.round(clamp(v * (1 - amount), 0, 255))
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`
}

type RowLayout = { cy: number; w: number; h: number; step: number }

function rowLayout(row: Row, width: number, height: number, cfg: ReelsConfig): RowLayout {
  const mobile = width < MOBILE
  const top = Math.max(height * clamp(cfg.topInset, 0, 0.4), mobile ? cfg.topSpaceMobile : cfg.topSpace)
  const bar = mobile ? 132 : 112
  const look = Math.max(120, height - top - bar) * clamp(cfg.lookScale, 0.5, 1.3)
  const y0 = top + (height - top - bar - look) / 2
  const spacing = clamp(cfg.spacing, 0.6, 1.8)
  // Without a shoe row the two garments grow into the space it leaves.
  const twoRows = !cfg.shoes.length
  if (row === "tops") {
    const h = look * (twoRows ? 0.44 : 0.42)
    const w = Math.min(h * 0.92, width * (mobile ? 0.46 : 0.3))
    return { cy: y0 + h / 2, w, h, step: w * (mobile ? 1.02 : 1.18) * spacing }
  }
  if (row === "bottoms") {
    // Two rows: the trousers start below the jacket row with a clear gap
    // (top row ends at 44%, trousers start at 49%), so pieces never touch.
    const h = look * (twoRows ? 0.51 : 0.47)
    const w = Math.min(h * 0.7, width * (mobile ? 0.36 : 0.26))
    return { cy: y0 + look * (twoRows ? 0.49 : 0.385) + h / 2, w, h, step: w * (mobile ? 1.16 : 1.4) * spacing }
  }
  const h = look * 0.13
  const w = Math.min(h * 2.4, width * (mobile ? 0.44 : 0.2))
  return { cy: y0 + look * 0.855 + h / 2, w, h, step: w * (mobile ? 0.9 : 1.08) * spacing }
}

// Position of one piece on the curved track, `rel` slots from the centre.
function slot(rel: number, layout: RowLayout, cfg: ReelsConfig, velocity: number) {
  const k = 0.34 * clamp(cfg.curve, 0, 2.5) + 1e-4
  const angle = rel * k
  const radius = layout.step / k
  const onTrack = Math.abs(angle) < 1.45
  const x = radius * Math.sin(clamp(angle, -1.5, 1.5))
  const depth = radius * (Math.cos(clamp(angle, -1.5, 1.5)) - 1)
  const persp = radius * 2.6 + 400
  const d = Math.abs(rel)
  return {
    x,
    scale: (persp / (persp - depth)) * (d < 1 ? 1 - 0.3 * d : 0.7 - 0.06 * (d - 1)),
    opacity: onTrack ? clamp(1.25 - d * 0.22, 0, 1) * clamp((1.45 - Math.abs(angle)) / 0.25, 0, 1) : 0,
    blur: clamp(d, 0, 2.5) * cfg.sideBlur + clamp(Math.abs(velocity) * 0.32, 0, 5.5),
    rotate: -angle * 22,
    z: Math.round(100 - d * 10),
  }
}

type Tween = { from: number; to: number; t0: number; dur: number; back: boolean }
type RowState = {
  off: number
  vel: number
  drag: boolean
  lastX: number
  lastT: number
  moved: number
  tween: Tween | null
  spring: number | null
  user?: boolean
  pointerId?: number
  downTarget?: Element | null
}

export function ScoopReels({ config }: { config: ReelsConfig }) {
  const cfg = config
  const pieces = useMemo(() => ({ tops: cfg.tops, bottoms: cfg.bottoms, shoes: cfg.shoes }), [cfg])
  const flavours = cfg.flavours

  const rootRef = useRef<HTMLDivElement>(null)
  const pieceEls = useRef<Record<Row, (HTMLDivElement | null)[]>>({ tops: [], bottoms: [], shoes: [] })
  const tagEls = useRef<Record<Row, HTMLDivElement | null>>({ tops: null, bottoms: null, shoes: null })
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg
  const piecesRef = useRef(pieces)
  piecesRef.current = pieces

  const [size, setSize] = useState({ w: 1200, h: 800 })
  const [current, setCurrent] = useState<Record<Row, number>>({ tops: 0, bottoms: 0, shoes: 0 })
  const [settled, setSettled] = useState<Record<Row, boolean>>({ tops: !cfg.intro, bottoms: !cfg.intro, shoes: !cfg.intro })
  const [flavourIndex, setFlavourIndex] = useState(0)
  // Photos load for the pieces on screen first (the centre and one either
  // side — all a phone shows; wider screens add a second either side after
  // mount); the rest of the ring loads once the page is idle, long before
  // the first spin brings them into view.
  const near = (offset: number, n: number, reach = 1) => new Set(Array.from({ length: n }, (_, i) => i).filter((i) => Math.abs(wrap(i - offset, n)) <= reach))
  const [loadAll, setLoadAll] = useState(false)
  // With the intro, each row is parked behind the overlay and then spins to
  // its first piece (index 0): both spots are known up front, so their photos
  // are in the initial HTML.
  const parked = (row: Row, n: number) => -SPIN_DIR[row] * (Math.max(8, n) + 3)
  const initialNear = (row: Row) => {
    const n = pieces[row].length
    if (!cfg.intro) return near(0, n)
    return new Set([...near(0, n), ...near(parked(row, n), n)])
  }
  const [nearby, setNearby] = useState<Record<Row, Set<number>>>(() => ({
    tops: initialNear("tops"),
    bottoms: initialNear("bottoms"),
    shoes: initialNear("shoes"),
  }))
  const [spinning, setSpinning] = useState(false)
  const [choosing, setChoosing] = useState(false)
  // Shuffling needs at least one row with a choice to make.
  const canShuffle = ROWS.some((r) => new Set(pieces[r].map((p) => p.id)).size > 1)
  const canShuffleRef = useRef(canShuffle)
  canShuffleRef.current = canShuffle

  const rows = useRef<Record<Row, RowState>>(
    Object.fromEntries(
      ROWS.map((r) => [r, { off: 0, vel: 0, drag: false, lastX: 0, lastT: 0, moved: 0, tween: null, spring: null }]),
    ) as Record<Row, RowState>,
  )
  const lastInteraction = useRef(0)
  const api = useRef<{ shuffle: (intro?: boolean) => void; go: (row: Row, by: number) => void; kick?: () => void }>({
    shuffle: () => {},
    go: () => {},
  })

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) })
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    let frame = 0
    let disposed = false
    let visible = true
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const st = rows.current

    const tweenTo = (row: Row, to: number, dur: number, back: boolean, delay = 0) => {
      const s = st[row]
      s.spring = null
      s.tween = { from: s.off, to, t0: performance.now() + delay, dur, back }
    }
    const nearest = (row: Row) => Math.round(st[row].off)
    const fitAt = (row: Row, i: number) => {
      const list = piecesRef.current[row]
      if (!list.length) return "any"
      return list[((i % list.length) + list.length) % list.length]?.fit || "any"
    }
    const compatible = (a: string, b: string) => a === "any" || b === "any" || a === b
    const centreIndex = (row: Row) => {
      const n = piecesRef.current[row].length || 1
      return ((Math.round(st[row].off) % n) + n) % n
    }

    // After a row is moved by hand, pull the other rows onto a matching fit.
    const reconcile = (moved: Row) => {
      let fit = fitAt(moved, centreIndex(moved))
      if (fit === "any")
        for (const r of ROWS) {
          if (r === moved) continue
          const f = fitAt(r, centreIndex(r))
          if (f !== "any") {
            fit = f
            break
          }
        }
      if (fit === "any") return
      ROWS.forEach((r, ri) => {
        if (r === moved) return
        const n = piecesRef.current[r].length
        if (!n || compatible(fitAt(r, centreIndex(r)), fit)) return
        let best = 1e9
        for (let i = 0; i < n; i++) {
          if (!compatible(fitAt(r, i), fit)) continue
          const d = Math.round(wrap(i - st[r].off, n))
          if (Math.abs(d) < Math.abs(best)) best = d
        }
        if (best !== 1e9) {
          tweenTo(r, Math.round(st[r].off) + best, reduced ? 1 : 750 + Math.abs(best) * 90, false, 160 + ri * 110)
          setSettled((s) => ({ ...s, [r]: false }))
        }
      })
    }

    api.current.go = (row, by) => {
      if (!piecesRef.current[row].length) return
      lastInteraction.current = performance.now()
      st[row].user = true
      tweenTo(row, nearest(row) + by, reduced ? 1 : 650 + Math.abs(by) * 90, false)
      setSettled((s) => ({ ...s, [row]: false }))
    }

    api.current.shuffle = (intro = false) => {
      const fits = Array.from(new Set(ROWS.flatMap((r) => piecesRef.current[r].map((p) => p.fit || "any")))).filter((f) => f !== "any")
      const fit = fits.length ? fits[Math.floor(reelsRandom() * fits.length)] : "any"
      ROWS.forEach((row, ri) => {
        const n = piecesRef.current[row].length
        if (!n) return
        const now = centreIndex(row)
        const options: number[] = []
        // Rows repeat pieces and carry several colours of one product: land
        // on a different product ("<slug>#<colour>" ids) when the row has one.
        const product = (i: number) => piecesRef.current[row][i]?.id.split("#")[0]
        const distinct = new Set(piecesRef.current[row].map((_, i) => product(i))).size > 1
        for (let i = 0; i < n; i++)
          if (compatible(fitAt(row, i), fit) && (i !== now || n === 1) && (!distinct || product(i) !== product(now))) options.push(i)
        // The intro always lands on each row's first piece, so the page knows
        // up front which photos the hero opens with; later shuffles are random.
        const target = intro ? 0 : options.length ? options[Math.floor(reelsRandom() * options.length)] : now
        const dir = SPIN_DIR[row]
        const ahead = dir > 0 ? (((target - now) % n) + n) % n : (((now - target) % n) + n) % n
        const laps = intro ? 0 : Math.max(1, Math.ceil(6 / n)) * n
        const to = nearest(row) + dir * (laps + ahead)
        if (intro) st[row].off = to - dir * (Math.max(8, n) + 3)
        tweenTo(
          row,
          to,
          reduced ? 1 : 1500 + ri * 260,
          true,
          reduced ? 0 : ri * 140 + (intro ? Math.max(0, cfgRef.current.introDelay) * 1000 : 0),
        )
      })
      if (!intro) {
        lastInteraction.current = performance.now()
        setFlavourIndex((i) => (i + 1) % Math.max(1, flavours.length))
      }
      setSpinning(true)
      setSettled({ tops: false, bottoms: false, shoes: false })
    }

    let last = performance.now()
    let shownIndex: Record<Row, number> = { tops: -1, bottoms: -1, shoes: -1 }
    let shownSettled: Record<Row, boolean> = { tops: false, bottoms: false, shoes: false }

    const tick = (now: number) => {
      frame = 0
      if (disposed) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const c = cfgRef.current
      const lists = piecesRef.current
      const box = el.getBoundingClientRect()
      const width = box.width
      const height = box.height
      const cx = width / 2
      let moving = false
      const nextIndex = { ...shownIndex }
      const nextSettled = { ...shownSettled }

      for (const row of ROWS) {
        const s = st[row]
        const n = lists[row].length
        if (!n) continue
        const before = s.off
        if (s.tween) {
          const p = (now - s.tween.t0) / s.tween.dur
          if (p >= 0) {
            const t = clamp(p, 0, 1)
            const e = s.tween.back ? backOut(t, 0.7) : cubicOut(t)
            s.off = s.tween.from + (s.tween.to - s.tween.from) * e
            if (p >= 1) {
              s.off = s.tween.to
              s.tween = null
            }
          }
        } else if (s.spring !== null && !s.drag) {
          const a = -90 * (s.off - s.spring) - 17 * s.vel
          s.vel += a * dt
          s.off += s.vel * dt
          if (Math.abs(s.off - s.spring) < 0.001 && Math.abs(s.vel) < 0.01) {
            s.off = s.spring
            s.vel = 0
            s.spring = null
          }
        }
        const velocity = s.drag ? s.vel : (s.off - before) / Math.max(dt, 0.001)
        if (!s.drag && !s.tween && s.spring === null) s.vel = 0
        const busy = s.drag || !!s.tween || s.spring !== null
        moving ||= busy
        nextIndex[row] = ((Math.round(s.off) % n) + n) % n
        nextSettled[row] = !busy

        const layout = rowLayout(row, width, height, c)
        const els = pieceEls.current[row]
        for (let i = 0; i < n; i++) {
          const node = els[i]
          if (!node) continue
          const p = slot(wrap(i - s.off, n), layout, c, velocity)
          if (p.opacity <= 0.001) {
            if (node.style.visibility !== "hidden") node.style.visibility = "hidden"
            continue
          }
          node.style.visibility = "visible"
          node.style.width = `${layout.w}px`
          node.style.height = `${layout.h}px`
          node.style.transform = `translate3d(${(cx + p.x - layout.w / 2).toFixed(2)}px, ${(layout.cy - layout.h / 2).toFixed(2)}px, 0) perspective(900px) rotateY(${p.rotate.toFixed(2)}deg) scale(${p.scale.toFixed(4)})`
          node.style.opacity = p.opacity.toFixed(3)
          const blur = Math.round(p.blur * 2) / 2
          const filter = blur > 0.25 ? `blur(${blur}px)` : "none"
          if (node.style.filter !== filter) node.style.filter = filter
          node.style.zIndex = String(row === "tops" ? p.z + 200 : row === "shoes" ? p.z + 100 : p.z)
        }

        const tag = tagEls.current[row]
        if (tag) {
          const mobile = width < MOBILE
          const tw = tag.offsetWidth || 160
          const x = Math.min(mobile ? cx + layout.w * 0.3 : cx + layout.w * 0.52 + 14, width - tw - 12)
          const y = row === "shoes" ? layout.cy - 6 : layout.cy - layout.h * 0.12
          // Phones hug the right edge. Placed with a transform from the left
          // (not `right:`), so a name changing length never moves the box's
          // origin — no layout shift while the reels spin.
          const tx = mobile ? width - tw - 14 : x
          tag.style.transform = `translate3d(${tx.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
        }
      }

      for (const row of ROWS)
        if (nextSettled[row] && !shownSettled[row] && st[row].user) {
          st[row].user = false
          reconcile(row)
        }

      if (ROWS.some((r) => nextIndex[r] !== shownIndex[r] || nextSettled[r] !== shownSettled[r])) {
        const allSettled = ROWS.every((r) => nextSettled[r] || !lists[r].length)
        shownIndex = nextIndex
        shownSettled = nextSettled
        setCurrent(nextIndex)
        setSettled(nextSettled)
        if (allSettled) setSpinning(false)
      }

      const auto = c.autoShuffle ?? 0
      if (auto > 0 && canShuffleRef.current && !moving && visible && !document.hidden && !reduced && now - lastInteraction.current > auto * 1000) {
        lastInteraction.current = now
        api.current.shuffle(false)
      }
      if (visible && !document.hidden) frame = requestAnimationFrame(tick)
    }

    const onDown = (e: PointerEvent) => {
      const target = (e.target as Element).closest<HTMLElement>("[data-row]")
      if (!target) return
      const row = target.dataset.row as Row
      const s = st[row]
      if (!piecesRef.current[row].length) return
      Object.assign(s, { drag: true, tween: null, spring: null, lastX: e.clientX, lastT: performance.now(), vel: 0, moved: 0 })
      s.pointerId = e.pointerId
      s.downTarget = e.target as Element
      lastInteraction.current = performance.now()
      setSettled((v) => ({ ...v, [row]: false }))
      frame ||= requestAnimationFrame(tick)
    }
    const onMove = (e: PointerEvent) => {
      for (const row of ROWS) {
        const s = st[row]
        if (!s.drag || s.pointerId !== e.pointerId) continue
        const layout = rowLayout(row, el.clientWidth, el.clientHeight, cfgRef.current)
        const dx = e.clientX - s.lastX
        const t = performance.now()
        const dt = Math.max(1, t - s.lastT) / 1000
        s.lastX = e.clientX
        s.lastT = t
        s.moved += Math.abs(dx)
        const delta = -dx / layout.step
        s.off += delta
        s.vel = s.vel * 0.6 + (delta / dt) * 0.4
        if (s.moved > 6) e.preventDefault()
      }
    }
    const onUp = (e: PointerEvent) => {
      for (const row of ROWS) {
        const s = st[row]
        if (!s.drag || s.pointerId !== e.pointerId) continue
        s.drag = false
        s.user = true
        lastInteraction.current = performance.now()
        if (s.moved < 6) {
          // A tap on a side piece brings it to the centre.
          const hit = s.downTarget?.closest?.<HTMLElement>("[data-idx]")
          const n = piecesRef.current[row].length
          if (hit && n) {
            const by = Math.round(wrap(parseInt(hit.dataset.idx || "0", 10) - s.off, n))
            if (by !== 0) {
              api.current.go(row, by)
              continue
            }
          }
        }
        s.spring = Math.round(s.off + clamp(s.vel, -30, 30) * 0.22)
      }
    }

    el.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove, { passive: false })
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true
      if (visible && !frame) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      }
    })
    io.observe(el)
    const onVisibility = () => {
      if (!document.hidden && visible && !frame) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)

    lastInteraction.current = performance.now() + Math.max(0, cfgRef.current.introDelay) * 1000
    if (cfgRef.current.intro && !reduced && canShuffleRef.current) api.current.shuffle(true)
    // The intro parks each row at its own start offset: load what's shown there.
    const reach = el.clientWidth < MOBILE ? 1 : 2
    setNearby(
      (prev) =>
        Object.fromEntries(
          ROWS.map((r) => {
            const n = piecesRef.current[r].length
            return [r, new Set([...prev[r], ...near(Math.round(st[r].off), n, reach), ...near(0, n, reach)])]
          }),
        ) as Record<Row, Set<number>>,
    )
    let idle = 0
    const whenIdle = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      idle = ric ? ric(() => setLoadAll(true), { timeout: 2000 }) : window.setTimeout(() => setLoadAll(true), 200)
    }
    if (document.readyState === "complete") whenIdle()
    else window.addEventListener("load", whenIdle, { once: true })
    frame = requestAnimationFrame(tick)
    api.current.kick = () => {
      frame ||= requestAnimationFrame(tick)
    }

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      el.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      io.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("load", whenIdle)
      const cic = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback
      if (cic) cic(idle)
      else clearTimeout(idle)
    }
  }, [flavours.length])

  const flavour = flavours[flavourIndex % flavours.length] ?? flavours[0]
  // A set shown as two pieces (gym top + leggings) shares one id: count it once.
  const centred = ROWS.map((r) => pieces[r][current[r]]).filter((p): p is Piece => !!p)
  const total = centred.filter((p, i) => centred.findIndex((q) => q.id === p.id) === i).reduce((sum, p) => sum + (p.price ?? 0), 0)
  const mobile = size.w < MOBILE
  const allSettled = ROWS.every((r) => settled[r] || !pieces[r].length)
  const look = ROWS.flatMap((r) => (pieces[r][current[r]] ? [pieces[r][current[r]]] : []))

  const addLook = (e: MouseEvent) => {
    e.preventDefault()
    setChoosing(true)
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-code-component
      data-mobile={mobile || undefined}
      style={{ background: flavour.color, ["--flavour" as string]: flavour.color } as CSSProperties}
    >
      <div className={styles.glow} aria-hidden />
      {flavours.map((f, i) => {
        const active = i === flavourIndex % flavours.length
        return (
          <div
            key={f.name}
            aria-hidden
            className={styles.word}
            data-active={active || undefined}
            style={{ color: darken(f.color || flavour.color, 0.045) }}
          >
            {f.name}
          </div>
        )
      })}

      {ROWS.filter((row) => pieces[row].length).map((row) => {
        const l = rowLayout(row, size.w, size.h, cfg)
        return (
          <div
            key={row}
            data-row={row}
            className={styles.hit}
            style={{ top: l.cy - l.h / 2, height: l.h, zIndex: row === "tops" ? 3 : row === "shoes" ? 2 : 1 }}
          />
        )
      })}

      <div className={styles.track}>
        {ROWS.map((row) =>
          pieces[row].map((p, i) => (
            <div
              key={row + i}
              data-row={row}
              data-idx={i}
              ref={(node) => {
                pieceEls.current[row][i] = node
              }}
              className={styles.piece}
            >
              <img
                src={loadAll || nearby[row].has(i) ? p.image : undefined}
                srcSet={loadAll || nearby[row].has(i) ? p.srcSet : undefined}
                sizes={row === "tops" ? "(max-width: 639px) 46vw, 30vw" : "(max-width: 639px) 36vw, 26vw"} alt={loadAll || nearby[row].has(i) ? p.name : ""} draggable={false} decoding="async" style={{ objectPosition: row === "tops" ? "50% 100%" : row === "bottoms" ? "50% 0%" : "50% 50%" }} />
            </div>
          )),
        )}
      </div>

      {ROWS.filter((row) => pieces[row].length).map((row) => {
        const p = pieces[row][current[row]]
        const show = !!p && settled[row]
        return (
          <div
            key={`tag-${row}`}
            ref={(node) => {
              tagEls.current[row] = node
            }}
            className={styles.tagSlot}
          >
            <div className={styles.tag} data-show={show || undefined}>
              <span className={styles.tagName}>{p?.name}</span>
              {typeof p?.price === "number" && <span className={styles.tagPrice}>{formatPrice(p.price)}</span>}
            </div>
          </div>
        )
      })}

      <div className={styles.bar}>
        <div className={styles.left}>
          {canShuffle && (
          <button
            type="button"
            className={styles.shuffle}
            aria-label="Shuffle"
            data-shuffle
            onClick={() => {
              api.current.shuffle(false)
              api.current.kick?.()
            }}
          >
            <span className={styles.dice} data-spinning={spinning || undefined}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
                <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
              </svg>
            </span>
            Shuffle
          </button>
          )}
          {canShuffle && <span className={styles.hint}>Drag any row to restyle</span>}
        </div>
        <div className={styles.right}>
          <div className={styles.total}>
            <span className={styles.totalLabel}>The look</span>
            <span className={styles.totalValue} style={{ opacity: allSettled ? 1 : 0.7 }}>
              {formatPrice(total)}
            </span>
          </div>
          <a href="/shop" className={styles.cta} onClick={look.length ? addLook : undefined} data-add-look>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M9 10V6.5a3 3 0 0 1 6 0V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {look.length ? "Add the look" : "Shop all"}
          </a>
        </div>
      </div>
      {choosing && <LookChooser pieces={look} onClose={() => setChoosing(false)} />}
    </div>
  )
}

// Pick colour and size for each piece of the look. Only variants the catalog
// can sell are offered; if a piece has none, the look can't be added.
function LookChooser({ pieces, onClose }: { pieces: Piece[]; onClose: () => void }) {
  // Piece ids are "<slug>#<colour>"; styling-only pieces aren't in the catalog.
  const chosen = pieces.filter((piece, i) => pieces.findIndex((q) => q.id.split("#")[0] === piece.id.split("#")[0]) === i).flatMap((piece) => {
    const [slug, colour] = piece.id.split("#")
    const p = getProduct(slug)
    return p ? [{ p, colour: p.colours.some((c) => c.name === colour) ? colour : (p.colours[0]?.name ?? "") }] : []
  })
  const items = chosen.map((c) => c.p)
  const [picks, setPicks] = useState(() => chosen.map((c) => ({ colour: c.colour, size: "" })))
  const ready = items.length > 0 && items.every((p, i) => canOrder(p, picks[i].colour, picks[i].size))
  const sellable = items.every((p) => p.colours.some((c) => p.sizes.some((s) => canOrder(p, c.name, s))))
  const set = (i: number, patch: Partial<(typeof picks)[number]>) => setPicks((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  return (
    <div className={styles.chooser} role="dialog" aria-label="Add the look" data-look-chooser onPointerDown={(e) => e.stopPropagation()}>
      <div className={styles.chooserHead}>
        <span>Add the look</span>
        <button type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {items.map((p, i) => (
        <div key={p.slug} className={styles.chooserRow}>
          <a href={`/products/${p.slug}?colour=${encodeURIComponent(picks[i].colour)}`} className={styles.chooserName}>
            {p.name}
            <span>{formatPrice(p.price)}</span>
          </a>
          <div className={styles.chooserPicks}>
            <select aria-label={`${p.name} colour`} value={picks[i].colour} onChange={(e) => set(i, { colour: e.target.value })}>
              {p.colours.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
            <select aria-label={`${p.name} size`} value={picks[i].size} onChange={(e) => set(i, { size: e.target.value })}>
              <option value="">Size</option>
              {p.sizes.map((s) => (
                <option key={s} value={s} disabled={!canOrder(p, picks[i].colour, s)}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
      <button
        type="button"
        className={styles.chooserAdd}
        data-look-add
        disabled={!ready}
        onClick={() => {
          if (addToBag(items.map((p, i) => ({ slug: p.slug, ...picks[i] }))) === items.length) onClose()
        }}
      >
        {sellable ? "Add to bag" : "Sold out"}
      </button>
    </div>
  )
}

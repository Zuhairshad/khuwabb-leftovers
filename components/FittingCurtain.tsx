"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"

// Two striped curtains on a rod that draw apart when 30% of the area is in
// view, and close again when it is scrolled back above (not below) the fold.
type Props = {
  leftColor?: string
  rightColor?: string
  edge?: number
  edgeMobile?: number
  pleat?: number
  duration?: number
  delay?: number
  threshold?: number
  replay?: boolean
  rod?: boolean
}

function rgb(color: string): [number, number, number] {
  const m = /rgba?\(([^)]+)\)/.exec(color)
  if (m) {
    const [r, g, b] = m[1].split(",").map(parseFloat)
    return [r, g, b]
  }
  let hex = color.replace("#", "")
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join("")
  const n = parseInt(hex.slice(0, 6), 16)
  return Number.isNaN(n) ? [200, 200, 200] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Lighten (t > 0) or darken (t < 0) towards white/black.
function shade(color: string, t: number) {
  const f = (v: number) => Math.round(Math.max(0, Math.min(255, t >= 0 ? v + (255 - v) * t : v * (1 + t))))
  const [r, g, b] = rgb(color)
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`
}

const pleats = (c: string, w: number) =>
  `repeating-linear-gradient(90deg, ${shade(c, -0.14)} 0px, ${shade(c, 0.05)} ${w * 0.22}px, ${shade(c, 0.38)} ${w * 0.45}px, ${shade(c, 0.08)} ${w * 0.68}px, ${shade(c, -0.1)} ${w * 0.9}px, ${shade(c, -0.14)} ${w}px)`

export function FittingCurtain({
  leftColor = "#D5E5BE",
  rightColor = "#F6C9CF",
  edge = 56,
  edgeMobile = 18,
  pleat = 56,
  duration = 2.2,
  delay = 0.15,
  threshold = 0.3,
  replay = true,
  rod = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState(1200)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.getBoundingClientRect().width))
    ro.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setOpen(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (entry.isIntersecting) setOpen(true)
        else if (replay && entry.boundingClientRect.top > 0) setOpen(false)
      },
      { threshold: Math.max(0, Math.min(1, threshold)) },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [replay, threshold])

  const visibleEdge = width < 640 ? edgeMobile : edge
  const panel = (side: "left" | "right"): CSSProperties => ({
    position: "absolute",
    top: rod ? 10 : 0,
    bottom: 0,
    [side]: 0,
    width: "50.5%",
    background: pleats(side === "left" ? leftColor : rightColor, pleat),
    transform: open ? (side === "left" ? `translateX(calc(-100% + ${visibleEdge}px))` : `translateX(calc(100% - ${visibleEdge}px))`) : "translateX(0) skewY(0deg)",
    transformOrigin: side === "left" ? "0% 0%" : "100% 0%",
    transition: `transform ${duration}s cubic-bezier(0.65, 0, 0.35, 1) ${open ? delay : 0}s`,
    willChange: "transform",
  })
  const hem: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 26,
    background: "linear-gradient(180deg, rgba(23,20,15,0) 0%, rgba(23,20,15,0.16) 100%)",
  }
  const fold = (side: "left" | "right"): CSSProperties => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    [side === "left" ? "right" : "left"]: 0,
    width: 36,
    background: `linear-gradient(${side === "left" ? 90 : 270}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.28) 60%, rgba(23,20,15,0.12) 100%)`,
    opacity: open ? 0 : 1,
    transition: `opacity ${duration * 0.6}s ease ${open ? delay : 0}s`,
  })

  return (
    <div ref={ref} aria-hidden style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", pointerEvents: "none" }}>
      {(["left", "right"] as const).map((side) => (
        <div key={side} style={panel(side)}>
          <div style={fold(side)} />
          <div style={hem} />
        </div>
      ))}
      {rod && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 12,
            background: "linear-gradient(180deg, #ECE8E0 0%, #B4AFA6 55%, #77726A 100%)",
          }}
        />
      )}
    </div>
  )
}

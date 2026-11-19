"use client"

import { useAnimationFrame, useMotionValue, useTransform, m, wrap } from "framer-motion"
import { useEffect, useRef, useState, type ReactNode } from "react"

// Endless horizontal ticker: advances from page load, pauses on hover
// (hoverFactor 0) and can be dragged. (The original advances whether or not
// it is on screen; measured against the snapshot.)
export function Ticker({
  children,
  velocity = 34,
  gap = 28,
  hoverFactor = 0,
  className,
  listClassName,
}: {
  children: ReactNode
  velocity?: number
  gap?: number
  hoverFactor?: number
  className?: string
  listClassName?: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const set = useRef<HTMLDivElement>(null)
  const [setLength, setSetLength] = useState(0)
  const [copies, setCopies] = useState(1)
  const offset = useMotionValue(0)
  const factor = useRef(1)
  const drag = useRef<{ x: number; id: number } | null>(null)

  useEffect(() => {
    const measure = () => {
      if (!set.current || !root.current) return
      const length = set.current.offsetWidth
      setSetLength(length)
      // Enough repeats to cover the container while one set scrolls past.
      setCopies(Math.max(1, Math.ceil(root.current.offsetWidth / (length + gap))))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (set.current) ro.observe(set.current)
    if (root.current) ro.observe(root.current)
    return () => ro.disconnect()
  }, [gap])

  useAnimationFrame((_, delta) => {
    if (!setLength || drag.current) return
    offset.set(offset.get() - (delta / 1000) * velocity * factor.current)
  })

  const rendered = useTransform(offset, (v) => (setLength ? wrap(-setLength - gap, 0, v) : 0))

  return (
    <div
      ref={root}
      className={className}
      onMouseEnter={() => (factor.current = hoverFactor)}
      onMouseLeave={() => (factor.current = 1)}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, id: e.pointerId }
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!drag.current || drag.current.id !== e.pointerId) return
        offset.set(offset.get() + (e.clientX - drag.current.x))
        drag.current.x = e.clientX
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <m.ul style={{ x: rendered, display: "flex", gap, margin: 0, padding: 0, listStyle: "none" }}>
        <li>
          <div ref={set} className={listClassName}>
            {children}
          </div>
        </li>
        {Array.from({ length: copies }, (_, i) => (
          <li key={i} aria-hidden>
            <div className={listClassName}>{children}</div>
          </li>
        ))}
      </m.ul>
    </div>
  )
}

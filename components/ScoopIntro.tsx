"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { skipsIntro } from "@/lib/intro"
import intro from "@/data/scoop-intro.json"
import { atLeast } from "@/lib/img"
import styles from "./ScoopIntro.module.css"

// Slot-machine intro: each letter of the brand sits in an arch that spins
// through product cut-outs and lands on its letter, then the arches fly out.
const BRAND = Array.from(intro.brand.slice(0, 8))
const COLORS = intro.colors
// Frames flash past at most ~250×345 px: use the light WebP copies.
const IMAGES = intro.images.map((src) => atLeast(src, 0))
const SPINS = Math.max(3, Math.min(12, Math.round(intro.spins)))
const SPEED = 1 / Math.max(0.5, Math.min(2, intro.speed || 1))
const SPIN_START = 0.35
const spinDuration = (i: number) => 1.35 + i * 0.2
const SETTLED = SPIN_START + spinDuration(BRAND.length - 1) + 0.55
const TOTAL = (SETTLED + 1.15) * SPEED
const s = (sec: number) => `${(sec * SPEED).toFixed(3)}s`

export function ScoopIntro() {
  // Product pages open directly, without the intro.
  return skipsIntro(usePathname()) ? null : <Intro />
}

function Intro() {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const root = document.documentElement
    const previous = root.style.overflow
    if (intro.lockScroll && !reduced) root.style.overflow = "hidden"
    const t = setTimeout(
      () => {
        root.style.overflow = previous
        setDone(true)
      },
      (reduced ? 0.8 : TOTAL) * 1000 + 80,
    )
    return () => {
      clearTimeout(t)
      root.style.overflow = previous
    }
  }, [])

  if (done) return null

  const end = (((SPINS - 1) / SPINS) * 100).toFixed(4)
  const overshoot = (((SPINS - 1) / SPINS) * 100 + (0.07 / SPINS) * 100).toFixed(4)
  const archW = `min(${(88 / BRAND.length).toFixed(2)}vw, 250px, ${(60 / 1.38).toFixed(2)}vh)`

  return (
    <div
      className={styles.root}
      aria-hidden
      data-intro
      style={{
        ["--arch-w" as string]: archW,
        ["--spin-end" as string]: `-${end}%`,
        ["--spin-overshoot" as string]: `-${overshoot}%`,
        animation: `siBg ${s(0.9)} cubic-bezier(0.65,0,0.35,1) ${s(SETTLED + 0.15)} forwards, siOut 0.01s linear ${s(SETTLED + 1.1)} forwards`,
      }}
    >
      <div className={styles.row}>
        {BRAND.map((letter, i) => {
          const color = COLORS[i % COLORS.length]
          return (
            <div
              key={i}
              style={{ animation: `${i % 2 === 0 ? "siUp" : "siDown"} ${s(1)} cubic-bezier(0.76,0,0.24,1) ${s(SETTLED + i * 0.06)} forwards` }}
            >
              <div className={styles.arch} style={{ background: color, animation: `siIn ${s(0.7)} cubic-bezier(0.22,1,0.36,1) ${s(0.05 + i * 0.05)} forwards` }}>
                <div
                  className={styles.reel}
                  style={{ height: `${SPINS * 100}%`, animation: `siSpin ${s(spinDuration(i))} cubic-bezier(0.35,0.05,0.2,1) ${s(SPIN_START)} forwards` }}
                >
                  {Array.from({ length: SPINS }, (_, a) => {
                    const last = a === SPINS - 1
                    const image = IMAGES[(i * 3 + a * 5) % IMAGES.length]
                    return (
                      <div key={a} className={styles.cell} style={{ background: last ? color : COLORS[(i + a + 1) % COLORS.length] }}>
                        {last ? <span className={styles.letter}>{letter}</span> : <div className={styles.frame} style={{ backgroundImage: `url(${image})` }} />}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

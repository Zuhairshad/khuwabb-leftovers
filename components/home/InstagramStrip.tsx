"use client"

import { useEffect, useRef, useState } from "react"
import type { InstagramPost } from "@/lib/instagram"
import { trimTo } from "@/lib/site"
import styles from "./InstagramFeed.module.css"

// Reels play muted while at least half on screen and pause when scrolled
// away. With reduced motion only the cover frame shows.
function Reel({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    setAllowed(!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  }, [])

  useEffect(() => {
    const video = ref.current
    if (!allowed || !video) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.5 },
    )
    io.observe(video)
    return () => io.disconnect()
  }, [allowed])

  if (!allowed) return null
  return (
    <video
      ref={ref}
      className={styles.video}
      data-playing={playing || undefined}
      src={src}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
      onPlaying={() => setPlaying(true)}
    />
  )
}

function ReelIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5" />
      <path d="M2.75 8h18.5M8.5 2.75 11.5 8M14.5 2.75 17.5 8" />
      <path d="M10 11.25v6l5-3z" fill="currentColor" />
    </svg>
  )
}

function CarouselIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <rect x="7.75" y="2.75" width="13.5" height="13.5" rx="3" />
      <path d="M16.25 19.25a2 2 0 0 1-2 2H5.75a3 3 0 0 1-3-3V9.75a2 2 0 0 1 2-2" />
    </svg>
  )
}

export function InstagramStrip({ posts }: { posts: InstagramPost[] }) {
  return (
    <ul className={styles.strip}>
      {posts.map((p) => (
        <li key={p.id} className={styles.tile}>
          <a
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
            aria-label={`${p.kind === "video" ? "Reel" : "Post"} on Instagram${p.caption ? `: ${trimTo(p.caption, 90)}` : ""}`}
          >
            <img className={styles.media} src={p.image} alt="" loading="lazy" decoding="async" />
            {p.video && <Reel src={p.video} />}
            {p.kind !== "image" && <span className={styles.badge}>{p.kind === "video" ? <ReelIcon /> : <CarouselIcon />}</span>}
            <span className={styles.hover} aria-hidden>
              <span className={styles.glyph} />
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

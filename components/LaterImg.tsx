"use client"

import { useEffect, useState, type ImgHTMLAttributes } from "react"

// A photo further down the page. On the first load its fetch waits a beat
// after the page's load event, so the hero's photos (and the intro, which
// covers the page meanwhile) get the bandwidth first. Later client-side
// visits show it straight away.
let ready = false
const waiting = new Set<() => void>()
let armed = false

function arm() {
  if (armed) return
  armed = true
  const fire = () =>
    window.setTimeout(() => {
      ready = true
      waiting.forEach((f) => f())
      waiting.clear()
    }, 800)
  if (document.readyState === "complete") fire()
  else window.addEventListener("load", fire, { once: true })
}

export function LaterImg({ src, srcSet, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const [on, setOn] = useState(ready)
  useEffect(() => {
    if (ready) return setOn(true)
    const show = () => setOn(true)
    waiting.add(show)
    arm()
    return () => {
      waiting.delete(show)
    }
  }, [])
  return <img {...rest} src={on ? src : undefined} srcSet={on ? srcSet : undefined} />
}

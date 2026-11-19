"use client"

import { useEffect, useState } from "react"

export function useMedia(query: string, fallback = false) {
  const [matches, setMatches] = useState(fallback)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const sync = () => setMatches(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [query])
  return matches
}

export const PHONE = "(max-width: 809.98px)"
export const BELOW_DESKTOP = "(max-width: 1199.98px)"

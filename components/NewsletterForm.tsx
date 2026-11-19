"use client"

import { useState, type FormEvent } from "react"
import styles from "./NewsletterForm.module.css"

// No list provider yet: a valid address opens a pre-filled email to the shop.
const SHOP_EMAIL = "khuwabb@gmail.com"
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

export function NewsletterForm() {
  const [email, setEmail] = useState("")
  const [state, setState] = useState<"idle" | "bad" | "sending" | "done">("idle")

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) {
      setState("bad")
      return
    }
    setState("sending")
    const body = encodeURIComponent(`Please add me to the list: ${email.trim()}`)
    window.location.href = `mailto:${SHOP_EMAIL}?subject=${encodeURIComponent("Sign me up")}&body=${body}`
    setState("done")
  }

  return (
    <div className={styles.root} data-code-component>
      <form className={styles.form} data-state={state} onSubmit={submit} noValidate>
        <input
          type="email"
          name="email"
          required
          aria-label="Your email"
          placeholder="Your email"
          value={email}
          disabled={state === "done"}
          onChange={(e) => {
            setEmail(e.target.value)
            if (state === "bad") setState("idle")
          }}
        />
        <button type="submit">Subscribe</button>
        <div className={styles.done} aria-live="polite">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {state === "done" ? "You’re in. See you in your inbox." : ""}
        </div>
      </form>
      <div className={styles.error} data-show={state === "bad" || undefined}>
        That email doesn’t look right
      </div>
    </div>
  )
}

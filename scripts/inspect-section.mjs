// Dev aid: print a compact, measured tree of one section of either server.
//   node scripts/inspect-section.mjs <selector> [width=1440] [side=framer] [maxDepth=12]
// Shows geometry relative to the section, text, image sources and the
// computed styles that differ from defaults, after the section is in view.
import { chromium } from "playwright"

const [selector, width = "1440", side = "framer", maxDepth = "12"] = process.argv.slice(2)
const base = side === "next" ? "http://localhost:3000" : "http://localhost:3100"
const route = process.env.ROUTE ?? "/"
const mobile = Number(width) < 810

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(width), height: mobile ? 844 : 900 }, hasTouch: mobile })
await page.goto(base + route, { waitUntil: "networkidle" })
await page.evaluate(() => document.fonts.ready)
await page.locator(selector).first().evaluate((el) => el.scrollIntoView({ block: "start" }))
await page.waitForTimeout(Number(process.env.WAIT ?? 2500))
if (process.env.CLICK) {
  await page.locator(process.env.CLICK).first().click({ force: true })
  await page.waitForTimeout(1500)
}

const out = await page.evaluate(
  ({ selector, maxDepth }) => {
    const root = document.querySelector(selector)
    const R = root.getBoundingClientRect()
    const KEYS = {
      display: ["block", "inline"],
      position: ["static"],
      flexDirection: ["row"],
      justifyContent: ["normal"],
      alignItems: ["normal"],
      gap: ["normal"],
      flexWrap: ["nowrap"],
      padding: ["0px"],
      overflow: ["visible"],
      backgroundColor: ["rgba(0, 0, 0, 0)"],
      backgroundImage: ["none"],
      borderRadius: ["0px"],
      border: ["0px none rgb(0, 0, 0)", "0px none rgb(23, 20, 15)"],
      boxShadow: ["none"],
      opacity: ["1"],
      transform: ["none"],
      filter: ["none"],
      backdropFilter: ["none"],
      zIndex: ["auto"],
      objectFit: ["fill"],
      objectPosition: ["50% 50%"],
      mixBlendMode: ["normal"],
    }
    const TEXT = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "color", "textAlign", "textTransform", "textDecorationLine", "whiteSpace"]
    const lines = []
    const walk = (el, depth) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      if (cs.display === "contents") {
        for (const c of el.children) walk(c, depth)
        return
      }
      if (cs.display === "none" || (!r.width && !r.height)) return
      const name = el.getAttribute("data-framer-name") || el.getAttribute("data-section") || ""
      const props = []
      for (const [k, defs] of Object.entries(KEYS)) {
        const v = cs[k]
        if (v && !defs.includes(v)) props.push(`${k}:${v.length > 90 ? v.slice(0, 90) + "…" : v}`)
      }
      const ownText = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim()
      if (ownText || el.tagName === "INPUT" || el.tagName === "BUTTON") for (const k of TEXT) props.push(`${k}:${cs[k]}`)
      const tag = el.tagName.toLowerCase()
      const extra =
        tag === "img"
          ? ` src=${(el.currentSrc || el.src).replace(location.origin, "").replace(/^.*framerusercontent\.com\//, "")} alt="${el.alt}"`
          : tag === "a"
            ? ` href=${el.getAttribute("href")}`
            : tag === "svg"
              ? ` svg(${el.getAttribute("viewBox")})`
              : tag === "input"
                ? ` placeholder="${el.placeholder}"`
                : ""
      lines.push(
        `${"  ".repeat(depth)}${tag}${name ? `[${name}]` : ""} ${Math.round(r.left - R.left)},${Math.round(r.top - R.top)} ${Math.round(r.width)}x${Math.round(r.height)}${extra}${ownText ? ` "${ownText.slice(0, 120)}"` : ""}${props.length ? "  {" + props.join("; ") + "}" : ""}`,
      )
      if (depth < maxDepth && tag !== "svg") for (const c of el.children) walk(c, depth + 1)
    }
    walk(root, 0)
    return lines.join("\n")
  },
  { selector, maxDepth: Number(maxDepth) },
)
console.log(out)
await browser.close()

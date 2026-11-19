// Sections and interaction states per route. `framer` selectors target the
// snapshot's data-framer-name layers; `next` selectors target data-section
// attributes in the rebuild.
const fx = (name) => `#main [data-framer-name="${name}"]`
const nx = (name) => `[data-section="${name}"]`
const sec = (name, framerName) => ({ name, framer: fx(framerName), next: nx(name) })
const both = (actions) => ({ framer: actions, next: actions })

// Random calls from these call sites get their own seeded stream on both
// sides: the Framer homepage module (reels) and the rebuild's reelsRandom().
export const RANDOM_STREAMS = [{ markers: ["Hg0BAK2HyNl3", "reelsRandom"], seed: 11 }]

const steps = (from, to, every) => Array.from({ length: Math.floor((to - from) / every) + 1 }, (_, i) => from + i * every)

const framerRoutes = {
  "/": {
    sections: [
      // Fixed nav over the hero, captured at the same moment as the hero.
      { ...sec("nav", "Nav"), keepFixed: true, atLoad: 6500 },
      // The reels auto-shuffle on a timer; capture at a fixed time after load.
      { ...sec("hero", "Hero"), atLoad: 6500 },
      sec("flavours", "Flavours"),
      // Ticker only moves while in view: jump straight to it from a fresh load.
      { ...sec("new-in", "New in"), atLoad: 6500, scroll: true },
      // Look cards cycle on a timer while on screen: fresh load, straight scroll.
      { ...sec("fresh-daily", "Fresh daily"), atLoad: 6500, scroll: true },
      sec("looks", "Looks"),
      sec("receipts", "Receipts"),
      sec("care-labels", "Care labels"),
      sec("footer", "Footer"),
    ],
    states: [
      // Intro overlay + reels spin-in, sampled from navigation.
      { section: "hero", name: "intro", onLoad: true, frames: [0, 300, 700, 1200, 2000, 3000, 3300, 3600, 4000, 4400, 5000, 6500] },
      // One shuffle: frames through the spin, then the settled outfit.
      {
        section: "hero",
        name: "shuffle",
        atLoad: 6500,
        trigger: { framer: [{ do: "click", sel: '#main [aria-label="Shuffle"]' }], next: [{ do: "click", sel: "[data-shuffle]" }] },
        frames: steps(0, 2400, 300),
        wait: 2500,
      },
      // Category card expanded: hover Shoes, sample the spring.
      {
        section: "flavours",
        name: "shoes-expanded",
        // Below 1200px the cards are stacked and hover does nothing.
        widths: ["wide"],
        // Let the row's own entrance finish before hovering.
        setupWait: 2500,
        setup: { framer: [{ do: "scrollTo", sel: '#main [data-framer-name="Scoops"]' }], next: [{ do: "scrollTo", sel: '[data-section="flavours"] > div:last-child' }] },
        trigger: { framer: [{ do: "hover", sel: '#main [data-framer-name="Scoops"] a[data-framer-name="Shoes"]' }], next: [{ do: "hover", sel: '[data-card="Jackets"]' }] },
        frames: [0, 150, 300, 450, 600, 900, 1300],
        capture: { framer: '#main [data-framer-name="Scoops"]', next: '[data-section="flavours"] > div:last-child' },
      },
      // Phone menu open.
      {
        section: "nav",
        name: "menu-open",
        widths: ["mobile"],
        atLoad: 6500,
        trigger: { framer: [{ do: "click", sel: '#main [data-framer-name="Menu"]' }], next: [{ do: "click", sel: "[data-menu-toggle]" }] },
        frames: [0, 100, 200, 300, 450, 700],
        capture: { framer: "viewport", next: "viewport" },
      },
      // Bag drawer open (empty bag).
      {
        section: "bag",
        name: "open",
        atLoad: 6500,
        trigger: { framer: [{ do: "click", sel: '#main button[aria-label^="Bag"]' }], next: [{ do: "click", sel: "[data-bag-button]" }] },
        frames: [0, 150, 300, 500, 900],
      },
    ],
  },
  "/shop": {
    sections: [
      { ...sec("nav", "Nav"), keepFixed: true, atLoad: 6500 },
      sec("intro", "Intro"),
      sec("products", "Products"),
      sec("footer", "Footer"),
    ],
    states: [
      // Page-load entrance of the freezer photo and heading.
      { section: "intro", name: "load", onLoad: true, frames: [0, 1200, 3000, 3600, 4000, 4300, 5500] },
      // Cut-out pop on hover.
      {
        section: "products",
        name: "card-hover",
        widths: ["desktop"],
        setup: { framer: [{ do: "scrollTo", sel: '#main [data-framer-name="Product grid"]' }], next: [{ do: "scrollTo", sel: '[data-section="products"] > div' }] },
        setupWait: 2000,
        trigger: { framer: [{ do: "hover", sel: '#main [data-framer-name="Scoop card"] > *' }], next: [{ do: "hover", sel: '[data-section="products"] a > div > div' }] },
        frames: [0, 150, 300, 500, 900],
        capture: { framer: '#main [data-framer-name="Product"]', next: '[data-section="products"] a' },
      },
    ],
  },
  "/new-in": {
    sections: [
      { ...sec("nav", "Nav"), keepFixed: true, atLoad: 6500 },
      { name: "header", framer: fx("Header"), next: '[data-section="new-in-page"] > div:first-child' },
      { name: "grid", framer: fx("New in grid"), next: '[data-section="new-in-grid"]' },
      sec("footer", "Footer"),
    ],
    states: [
      { section: "header", name: "load", onLoad: true, frames: [0, 3000, 3600, 4000, 4300, 5500] },
      // Hanger swing on hover.
      {
        section: "grid",
        name: "hanger-hover",
        widths: ["desktop"],
        setup: { framer: [{ do: "scrollTo", sel: '#main [data-framer-name="New in grid"]' }], next: [{ do: "scrollTo", sel: '[data-section="new-in-grid"]' }] },
        setupWait: 1000,
        trigger: { framer: [{ do: "hover", sel: '#main [data-framer-name="Hanger"] [data-framer-name="Card"]' }], next: [{ do: "hover", sel: '[data-section="new-in-grid"] a > div' }] },
        frames: [0, 150, 300, 500, 800, 1200],
        capture: { framer: '#main [data-framer-name="New in grid"] > :first-child', next: '[data-section="new-in-grid"] > :first-child' },
      },
    ],
  },
}

// Product detail exists only in the rebuild (Khuwabb pass); compared against
// the reviewed baseline, which 404s here, it shows what the page adds.
framerRoutes["/products/seam-detail-co-ords-set"] = {
  sections: [{ name: "nav", framer: nx("nav"), next: nx("nav"), keepFixed: true, atLoad: 6500 }, { name: "product", framer: nx("product"), next: nx("product") }, { name: "footer", framer: nx("footer"), next: nx("footer") }],
  states: [],
}

// COMPARE_BASELINE=1: the "framer" side is a reviewed build of this app (e.g.
// FRAMER_URL=http://localhost:3200), so it uses the rebuild's selectors too.
const asBaseline = (v) => {
  if (Array.isArray(v)) return v.map(asBaseline)
  if (v && typeof v === "object") {
    const o = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, asBaseline(x)]))
    if ("framer" in o && "next" in o) o.framer = o.next
    return o
  }
  return v
}
export const routes = process.env.COMPARE_BASELINE ? asBaseline(framerRoutes) : framerRoutes

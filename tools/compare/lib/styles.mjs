// Computed-style reading and comparison.
export const PROPS = [
  "font-family",
  "font-size",
  "line-height",
  "font-weight",
  "letter-spacing",
  "color",
  "background-color",
  "padding",
  "margin",
  "gap",
  "width",
  "height",
]

/** Runs in the page: first match of `selector` -> { found, styles } */
export async function readStyles(page, selector, props = PROPS) {
  return page.evaluate(
    ({ selector, props }) => {
      const el = document.querySelector(selector)
      if (!el) return { found: false }
      const cs = getComputedStyle(el)
      const styles = {}
      for (const p of props) {
        let v = cs.getPropertyValue(p)
        if (!v && (p === "padding" || p === "margin"))
          v = ["top", "right", "bottom", "left"].map((s) => cs.getPropertyValue(`${p}-${s}`)).join(" ")
        if (!v && p === "gap") v = `${cs.getPropertyValue("row-gap")} ${cs.getPropertyValue("column-gap")}`
        styles[p] = v
      }
      return { found: true, styles }
    },
    { selector, props },
  ).catch((e) => ({ found: false, error: String(e.message || e) }))
}

export function normColour(v) {
  if (!v) return v
  const s = v.trim().toLowerCase()
  if (s === "transparent") return "rgba(0, 0, 0, 0)"
  const m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/)
  if (!m) return s
  let a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4])
  return `rgba(${Math.round(m[1])}, ${Math.round(m[2])}, ${Math.round(m[3])}, ${+a.toFixed(3)})`
}

const firstFamily = (v) =>
  (v || "").split(",")[0].trim().replace(/^["']|["']$/g, "").toLowerCase()

const pxList = (v) => {
  const parts = (v || "").trim().split(/\s+/)
  if (!parts.length || parts.some((p) => !/^-?[\d.]+px$/.test(p) && p !== "0")) return null
  return parts.map((p) => parseFloat(p))
}

/** Returns { equal, ref, theme } (normalised display values). */
export function compareProp(prop, a, b, tol = 1) {
  if (prop === "font-family") {
    const x = firstFamily(a), y = firstFamily(b)
    return { equal: x === y, ref: x, theme: y }
  }
  if (prop === "color" || prop === "background-color") {
    const x = normColour(a), y = normColour(b)
    const p = x?.match(/[\d.]+/g)?.map(Number), q = y?.match(/[\d.]+/g)?.map(Number)
    const equal = x === y || (p && q && p.length === 4 && q.length === 4 && p.slice(0, 3).every((n, i) => Math.abs(n - q[i]) <= 1) && Math.abs(p[3] - q[3]) <= 0.01)
    return { equal: !!equal, ref: x, theme: y }
  }
  const pa = pxList(a), pb = pxList(b)
  if (pa && pb) {
    // gap may be "10px" vs "10px 10px"
    const A = pa.length === 1 && pb.length === 2 ? [pa[0], pa[0]] : pa
    const B = pb.length === 1 && pa.length === 2 ? [pb[0], pb[0]] : pb
    const equal = A.length === B.length && A.every((n, i) => Math.abs(n - B[i]) <= tol)
    return { equal, ref: a, theme: b }
  }
  if (prop === "font-weight") {
    return { equal: String(a).trim() === String(b).trim(), ref: a, theme: b }
  }
  return { equal: (a || "").trim() === (b || "").trim(), ref: a, theme: b }
}

/** Compare one key-selector result pair. */
export function compareSelector(refRes, themeRes, tol = 1) {
  if (!refRes?.found && !themeRes?.found) return { status: "missing-both", props: [] }
  if (!refRes?.found) return { status: "missing-ref", props: [] }
  if (!themeRes?.found) return { status: "missing-theme", props: [] }
  const props = PROPS.map((p) => ({ prop: p, ...compareProp(p, refRes.styles[p], themeRes.styles[p], tol) }))
  return { status: props.some((p) => !p.equal) ? "mismatch" : "ok", props }
}

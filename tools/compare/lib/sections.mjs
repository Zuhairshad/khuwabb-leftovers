// Pure helpers for per-section capture.
export const safeName = (s) => String(s).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "section"

export const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const dataSel = (n) => `[data-section="${n}"]`

/**
 * pages.json `sections`: undefined -> null (discover every [data-section] per side);
 * [] -> none; strings are data-section names; objects are {name, ref?, theme?}
 * (omitted selector defaults to the data-section of `name`; explicit null = no equivalent).
 */
export function normaliseSections(sections) {
  if (sections === undefined) return null
  return (sections || []).map((s) =>
    typeof s === "string"
      ? { name: s, ref: dataSel(s), theme: dataSel(s) }
      : { name: s.name, ref: s.ref === undefined ? dataSel(s.name) : s.ref, theme: s.theme === undefined ? dataSel(s.name) : s.theme },
  )
}

/** Turn discovered data-section names (document order, may repeat) into section entries. */
export function fromDiscovered(names) {
  return [...new Set(names)].map((n) => ({ name: n, ref: dataSel(n), theme: dataSel(n) }))
}

/** Union of section names: ref order first, then theme-only names. */
export function unionNames(refSections, themeSections) {
  const out = []
  for (const s of [...refSections, ...themeSections]) if (!out.includes(s.name)) out.push(s.name)
  return out
}

/** Worst first; sections without a diff go last. */
export function sortWorstFirst(sections) {
  return [...sections].sort((a, b) => (b.diff?.percent ?? -1) - (a.diff?.percent ?? -1))
}

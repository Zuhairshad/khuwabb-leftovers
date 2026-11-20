// Offline self-test of diff/report/style-compare code (no browser, no servers).
import assert from "node:assert/strict"
import pngjs from "pngjs"
import { diffImages, sideBySide, writePng, readPng } from "./lib/image.mjs"
import { compareProp, compareSelector, normColour } from "./lib/styles.mjs"
import { renderReport } from "./lib/report.mjs"
const { PNG } = pngjs
const solid = (w, h, c) => { const p = new PNG({ width: w, height: h }); for (let i = 0; i < w * h; i++) p.data.set([...c, 255], i * 4); return p }

const same = diffImages(solid(20, 20, [10, 20, 30]), solid(20, 20, [10, 20, 30]))
assert.equal(same.percent, 0)
const taller = diffImages(solid(20, 20, [10, 20, 30]), solid(20, 30, [10, 20, 30]))
assert.equal(+taller.percent.toFixed(2), 33.33)
assert.equal(diffImages(solid(10, 10, [0, 0, 0]), solid(10, 10, [255, 255, 255])).percent, 100)
const sbs = readPng(writePng(sideBySide(solid(20, 20, [1, 1, 1]), solid(30, 10, [2, 2, 2]))))
assert.equal(sbs.width, 20 + 12 + 30)

assert.equal(normColour("rgb(1, 2, 3)"), "rgba(1, 2, 3, 1)")
assert.equal(normColour("transparent"), "rgba(0, 0, 0, 0)")
assert.ok(compareProp("font-family", '"Satoshi", Arial', "satoshi, sans-serif").equal)
assert.ok(compareProp("font-size", "16px", "16.8px").equal)
assert.ok(!compareProp("font-size", "16px", "18px").equal)
assert.ok(compareProp("padding", "10px 20px", "10.5px 20px").equal)
assert.ok(compareProp("gap", "10px", "10px 10px").equal)
assert.ok(compareProp("color", "rgb(0,0,0)", "rgba(0, 0, 0, 1)").equal)
const mk = (fs) => ({ found: true, styles: { "font-size": fs } })
assert.equal(compareSelector(mk("10px"), { found: false }).status, "missing-theme")
assert.equal(compareSelector({ found: false }, mk("1px")).status, "missing-ref")
const html = renderReport([{ page: "p", viewport: "desktop", files: [], selectors: [], errors: ["x<y"], diff: null, note: "no reference" }], { refUrl: "a", themeUrl: "b", when: "now", tolerance: 1 })
assert.ok(html.includes("x&lt;y"))
import { safeName, escapeRegExp, normaliseSections, fromDiscovered, unionNames, sortWorstFirst } from "./lib/sections.mjs"
assert.equal(safeName("New In/Grid"), "new-in-grid")
assert.ok(new RegExp("^\\s*" + escapeRegExp("M (UK)") + "\\s*$").test(" M (UK) "))
assert.equal(normaliseSections(undefined), null)
assert.deepEqual(normaliseSections([]), [])
assert.equal(normaliseSections(["hero"])[0].theme, '[data-section="hero"]')
assert.equal(normaliseSections([{ name: "g", ref: "a", theme: null }])[0].theme, null)
assert.deepEqual(fromDiscovered(["nav", "hero", "nav"]).map((s) => s.name), ["nav", "hero"])
assert.deepEqual(unionNames([{ name: "a" }, { name: "b" }], [{ name: "c" }, { name: "a" }]), ["a", "b", "c"])
assert.deepEqual(sortWorstFirst([{ name: "x", diff: { percent: 1 } }, { name: "y" }, { name: "z", diff: { percent: 9 } }]).map((s) => s.name), ["z", "x", "y"])
const html2 = renderReport([{ page: "p", viewport: "desktop", files: [], selectors: [], errors: [], diff: null, sections: [{ name: "hero", diff: { percent: 3, sizeRef: "1x1", sizeTheme: "1x1" }, files: ["section-hero--diff.png"] }] }], { refUrl: "a", themeUrl: "b", when: "now", tolerance: 1 })
assert.ok(html2.includes("section-hero--diff.png") && html2.includes("3.00%"))
console.log("selftest ok")

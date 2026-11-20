// PNG helpers: pad, side-by-side with labelled header, pixelmatch diff.
import pngjs from "pngjs"
import pixelmatch from "pixelmatch"

const { PNG } = pngjs
const GAP = 12
const BAND = 44
const SCALE = 4

const GLYPHS = {
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
}

function fill(png, x0, y0, w, h, [r, g, b, a = 255]) {
  for (let y = y0; y < Math.min(y0 + h, png.height); y++)
    for (let x = x0; x < Math.min(x0 + w, png.width); x++) {
      const i = (y * png.width + x) * 4
      png.data[i] = r
      png.data[i + 1] = g
      png.data[i + 2] = b
      png.data[i + 3] = a
    }
}

function drawText(png, text, x0, y0, color) {
  let x = x0
  for (const ch of text) {
    const g = GLYPHS[ch]
    if (g)
      g.forEach((row, ry) =>
        [...row].forEach((bit, rx) => {
          if (bit === "1") fill(png, x + rx * SCALE, y0 + ry * SCALE, SCALE, SCALE, color)
        }),
      )
    x += 6 * SCALE
  }
}

export const readPng = (buf) => PNG.sync.read(buf)
export const writePng = (png) => PNG.sync.write(png)

/** Copy `src` onto a new `w`x`h` canvas filled with `padColour` (default magenta, so padding always reads as a difference). */
export function pad(src, w, h, padColour = [255, 0, 255, 255]) {
  if (src.width === w && src.height === h) return src
  const out = new PNG({ width: w, height: h })
  fill(out, 0, 0, w, h, padColour)
  PNG.bitblt(src, out, 0, 0, src.width, src.height, 0, 0)
  return out
}

/** Labelled side-by-side: ref left (blue band "REF"), theme right (green band "THEME"). */
export function sideBySide(ref, theme) {
  const h = Math.max(ref.height, theme.height)
  const out = new PNG({ width: ref.width + GAP + theme.width, height: h + BAND })
  fill(out, 0, 0, out.width, out.height, [255, 255, 255, 255])
  fill(out, 0, 0, ref.width, BAND, [30, 80, 200])
  fill(out, ref.width + GAP, 0, theme.width, BAND, [20, 140, 70])
  fill(out, ref.width, 0, GAP, out.height, [255, 0, 120])
  drawText(out, "REF", 12, 8, [255, 255, 255])
  drawText(out, "THEME", ref.width + GAP + 12, 8, [255, 255, 255])
  PNG.bitblt(ref, out, 0, 0, ref.width, ref.height, 0, BAND)
  PNG.bitblt(theme, out, 0, 0, theme.width, theme.height, ref.width + GAP, BAND)
  return out
}

/** Pixelmatch diff after padding both to the larger size. Returns { png, diffPixels, total, percent, sizeRef, sizeTheme }. */
export function diffImages(ref, theme, threshold = 0.1) {
  const w = Math.max(ref.width, theme.width)
  const h = Math.max(ref.height, theme.height)
  const a = pad(ref, w, h)
  const b = pad(theme, w, h)
  const png = new PNG({ width: w, height: h })
  const diffPixels = pixelmatch(a.data, b.data, png.data, w, h, { threshold, includeAA: false })
  const total = w * h
  return {
    png,
    diffPixels,
    total,
    percent: total ? (diffPixels / total) * 100 : 0,
    sizeRef: `${ref.width}x${ref.height}`,
    sizeTheme: `${theme.width}x${theme.height}`,
  }
}

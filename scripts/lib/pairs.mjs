// For every <name>--framer.png / <name>--next.png pair in a folder: write a
// side-by-side <name>--sbs.png (Framer left, Next right) and measure the share
// of pixels whose colour differs by more than a small tolerance.
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import pngjs from "pngjs"

const { PNG } = pngjs
const GAP = 12
const TOLERANCE = 24 // per-channel, absorbs antialiasing noise

export async function pairFolder(dir) {
  const files = await readdir(dir)
  const rows = []
  for (const f of files.filter((f) => f.endsWith("--framer.png")).sort()) {
    const name = f.slice(0, -"--framer.png".length)
    if (!files.includes(`${name}--next.png`)) {
      rows.push({ name, diff: null, note: "next missing" })
      continue
    }
    const a = PNG.sync.read(await readFile(join(dir, f)))
    const b = PNG.sync.read(await readFile(join(dir, `${name}--next.png`)))
    const w = Math.max(a.width, b.width)
    const h = Math.max(a.height, b.height)
    const out = new PNG({ width: a.width + GAP + b.width, height: h })
    out.data.fill(255)
    PNG.bitblt(a, out, 0, 0, a.width, a.height, 0, 0)
    PNG.bitblt(b, out, 0, 0, b.width, b.height, a.width + GAP, 0)
    for (let y = 0; y < h; y++)
      for (let x = a.width; x < a.width + GAP; x++) {
        const i = (y * out.width + x) * 4
        out.data[i] = 255
        out.data[i + 1] = 0
        out.data[i + 2] = 120
        out.data[i + 3] = 255
      }
    await writeFile(join(dir, `${name}--sbs.png`), PNG.sync.write(out))

    let differing = 0
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const inA = x < a.width && y < a.height
        const inB = x < b.width && y < b.height
        if (!inA || !inB) {
          differing++
          continue
        }
        const i = (y * a.width + x) * 4
        const j = (y * b.width + x) * 4
        if (
          Math.abs(a.data[i] - b.data[j]) > TOLERANCE ||
          Math.abs(a.data[i + 1] - b.data[j + 1]) > TOLERANCE ||
          Math.abs(a.data[i + 2] - b.data[j + 2]) > TOLERANCE
        )
          differing++
      }
    const note = a.width !== b.width || a.height !== b.height ? `size ${a.width}x${a.height} vs ${b.width}x${b.height}` : ""
    rows.push({ name, diff: (differing / (w * h)) * 100, note })
  }
  return rows
}

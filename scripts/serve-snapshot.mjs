// Serves the untouched Framer snapshot (framer-snapshot/public) on :3100.
// Routes map to their index.html without redirecting, mirroring the export's
// Next.js rewrites, so relative asset paths resolve the same way.
import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../framer-snapshot/public/", import.meta.url))
const port = Number(process.env.PORT ?? 3100)

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
}

async function resolve(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "")
  const file = join(root, clean)
  if (!file.startsWith(root.slice(0, -1))) return null
  try {
    const s = await stat(file)
    if (s.isDirectory()) {
      const index = join(file, "index.html")
      await stat(index)
      return index
    }
    return file
  } catch {
    return null
  }
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://x")
  const file = await resolve(pathname)
  if (!file) {
    res.writeHead(404).end("not found")
    return
  }
  res.writeHead(200, {
    "content-type": types[extname(file).toLowerCase()] ?? "application/octet-stream",
    "cache-control": "no-store",
  })
  res.end(await readFile(file))
}).listen(port, () => console.log(`framer snapshot on http://localhost:${port}`))

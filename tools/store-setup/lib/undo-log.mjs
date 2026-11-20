// Undo log: every --apply write appends JSONL to tools/store-setup/out/undo-<store>-<ts>.jsonl.
// A "pending" line is written BEFORE the mutation and a "done" (or "failed") line after, sharing
// the same `id` so undo.mjs can pair them (an orphaned pending with no matching done/failed means
// the process died mid-mutation and it needs a manual check).
import { appendFileSync, mkdirSync, readdirSync, readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { ROOT } from "./data.mjs"

export const OUT_DIR = resolve(ROOT, "tools/store-setup/out")

export function undoLogPath(store, ts = new Date().toISOString().replace(/[:.]/g, "-")) {
  mkdirSync(OUT_DIR, { recursive: true })
  return resolve(OUT_DIR, `undo-${store}-${ts}.jsonl`)
}

export function makeUndoLogger(path) {
  let seq = 0
  const write = (entry) => appendFileSync(path, JSON.stringify(entry) + "\n")
  return {
    path,
    // Returns {id} — pass it back into the matching done()/failed() call for this op.
    pending({ step, op, target, before }) {
      const id = `${Date.now().toString(36)}-${++seq}`
      write({ id, ts: new Date().toISOString(), status: "pending", step, op, target, before })
      return { id }
    },
    done({ id, step, op, target, before, after, createdIds, undo }) {
      write({ id, ts: new Date().toISOString(), status: "done", step, op, target, before, after: after ?? null, createdIds: createdIds ?? null, undo: undo ?? null })
    },
    failed({ id, step, op, target, before, message }) {
      write({ id, ts: new Date().toISOString(), status: "failed", step, op, target, before, message })
    },
  }
}

export function readUndoLog(path) {
  if (!existsSync(path)) throw new Error(`no such undo log: ${path}`)
  return readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
}

// All undo-<store>-*.jsonl files for a store, so "collections created by this script" can be
// recognised across runs (collections step needs this for new-in product-adds and publishing).
export function allUndoLogsFor(store) {
  if (!existsSync(OUT_DIR)) return []
  return readdirSync(OUT_DIR).filter((f) => f.startsWith(`undo-${store}-`) && f.endsWith(".jsonl")).map((f) => resolve(OUT_DIR, f))
}

// Handles of collections this script created (status "done", op collectionCreate), across every
// undo log for this store. Used so default --apply only ever touches collections it made itself.
export function collectionsCreatedByScript(store) {
  const handles = new Set()
  for (const path of allUndoLogsFor(store)) {
    for (const entry of readUndoLog(path)) {
      if (entry.status === "done" && entry.op === "collectionCreate" && entry.target) handles.add(entry.target)
    }
  }
  return handles
}

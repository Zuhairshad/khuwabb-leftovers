#!/usr/bin/env node
// Khuwabb store setup (Admin GraphQL). See README.md.
import { parseArgs } from "node:util"
import { loadLocal, SHOPIFY_API_VERSION } from "./lib/data.mjs"
import { makeClient, checkStore } from "./lib/api.mjs"
import { STEPS, DEFAULT_STEPS } from "./lib/steps.mjs"
import { undoLogPath, makeUndoLogger } from "./lib/undo-log.mjs"
import { runBackup, hasRecentBackup } from "./lib/backup.mjs"

const { values: f } = parseArgs({
  options: {
    plan: { type: "boolean" }, "dry-run": { type: "boolean" }, apply: { type: "boolean" }, backup: { type: "boolean" },
    "go-live": { type: "boolean" }, "publish-new-collections": { type: "boolean" },
    "store-check": { type: "string" }, "no-backup-check": { type: "boolean" },
    only: { type: "string" }, verbose: { type: "boolean" }, descriptions: { type: "boolean" }, files: { type: "boolean" }, help: { type: "boolean" },
  },
})
if (f.help) {
  console.log(`node tools/store-setup/setup.mjs [--plan | --dry-run | --apply | --backup] [--go-live] [--publish-new-collections] [--store-check <handle>] [--no-backup-check] [--only step,...] [--descriptions] [--files] [--verbose]
Steps: ${Object.keys(STEPS).join(", ")}
--apply is additive-only by default (never changes/publishes/removes existing or customer-visible data).
--go-live unlocks the customer-visible / data-changing ops (needs --apply or --dry-run to preview).
--publish-new-collections publishes ONLY collections this script created.
--store-check <handle> is required for --apply and --backup; aborts before any write if the store doesn't match.
--backup is read-only; --apply refuses to run without a same-store backup from the last 24h (override: --no-backup-check).
See tools/store-setup/undo.mjs to reverse an --apply run from its undo log.`)
  process.exit(0)
}
if ([f.plan, f["dry-run"], f.apply, f.backup].filter(Boolean).length > 1) { console.error("Choose only one of --plan, --dry-run, --apply, --backup"); process.exit(2) }
if (f["go-live"] && !f.apply && !f["dry-run"]) { console.error("--go-live is only valid together with --apply (or --dry-run, to preview go-live ops)"); process.exit(2) }
if (f["publish-new-collections"] && !f.apply && !f["dry-run"]) { console.error("--publish-new-collections is only valid together with --apply (or --dry-run)"); process.exit(2) }
if ((f.apply || f.backup) && !f["store-check"]) { console.error("--store-check <handle> is required for --apply and --backup (e.g. --store-check citbkj-yj)"); process.exit(2) }

let steps = f.only ? f.only.split(",").map((s) => s.trim()) : [...DEFAULT_STEPS]
if (f.files && !f.only) steps.push("files")
const bad = steps.filter((s) => !STEPS[s])
if (bad.length) { console.error(`Unknown step(s): ${bad.join(", ")}. Valid: ${Object.keys(STEPS).join(", ")}`); process.exit(2) }
if (steps.includes("files") && !f.files && !f.only) steps = steps.filter((s) => s !== "files")

const local = loadLocal()
const store = process.env.SHOPIFY_STORE || "citbkj-yj.myshopify.com"
// The bare handle (no ".myshopify.com") is the one key used everywhere for undo logs and
// backup dirs, in every mode. If --store-check is given it must equal this (checkStore
// enforces that against the live domain); if not given (--dry-run / --plan only), we still
// need a stable key, so it's derived from SHOPIFY_STORE rather than from the flag.
const storeHandle = store.replace(/\.myshopify\.com$/i, "")
console.log(`Khuwabb store setup · ${store} · Admin API ${SHOPIFY_API_VERSION}`)
console.log(`Local data: ${local.items.length} products, ${local.media.length} media items`)
if (local.warnings.length) { console.log(`\nData warnings (${local.warnings.length}):`); for (const w of local.warnings) console.log("  ! " + w) }
else console.log("Colour/folder mapping validated against data/shopify.json: no mismatches")

if (f.plan) {
  const counts = {}
  for (const s of steps) {
    const lines = STEPS[s].plan(local, f)
    counts[s] = lines.length
    console.log(`\n== ${s} (${lines.length} operations)`)
    for (const l of lines) console.log("  - " + l)
  }
  console.log("\nPlan counts: " + Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ") + `; products=${local.items.length}, media items=${local.media.length}`)
  console.log("(offline plan; no network used)")
  process.exit(0)
}

const token = process.env.SHOPIFY_ADMIN_TOKEN
if (!token) { console.error("SHOPIFY_ADMIN_TOKEN is required for --dry-run / --apply / --backup (use --plan for an offline plan)."); process.exit(2) }

const api = makeClient({ store, token, verbose: f.verbose })
// Print shop name + domain on every non-plan run; abort before any write if --store-check given
// and it doesn't match (checkStore calls process.exit(2) itself; nothing has been written yet).
await checkStore(api, f["store-check"])

if (f.backup) {
  console.log("MODE: BACKUP (read-only)")
  await runBackup({ api }, storeHandle)
  process.exit(0)
}

const apply = !!f.apply
const goLive = !!f["go-live"]
const publishNewCollections = !!f["publish-new-collections"]
console.log(apply ? "MODE: APPLY (writes enabled)" : "MODE: DRY-RUN (reads only; nothing is written)")
console.log(goLive ? "GO-LIVE ops: enabled (customer-visible / data-changing writes may run)" : "GO-LIVE ops: disabled (default additive-only behaviour; go-live ops are reported, not run)")
if (publishNewCollections) console.log("PUBLISH-NEW-COLLECTIONS: enabled (script-created collections only)")

if (apply && !f["no-backup-check"]) {
  if (!hasRecentBackup(storeHandle)) {
    console.error(`ABORT: no backup for ${storeHandle} from the last 24h in tools/store-setup/out/backups/. Nothing written.`)
    console.error(`Make one first: node tools/store-setup/setup.mjs --backup --store-check ${storeHandle}`)
    console.error(`(Override, not recommended: --no-backup-check)`)
    process.exit(2)
  }
} else if (apply && f["no-backup-check"]) {
  console.log("!! --no-backup-check: proceeding WITHOUT verifying a recent backup exists. You are on your own if this goes wrong.")
}

let undoLog = null
if (apply) {
  const path = undoLogPath(storeHandle)
  undoLog = makeUndoLogger(path)
  console.log(`Undo log: ${path}`)
}

const ctx = { api, local, apply, goLive, publishNewCollections, flags: f, verbose: f.verbose, errors: [], cache: {}, store: storeHandle, undoLog }
const summary = {}
for (const s of steps) {
  console.log(`\n== ${s}`)
  try { summary[s] = await STEPS[s].run(ctx) } catch (e) { ctx.errors.push(`${s}: ${e.message}`); summary[s] = { errors: 1 }; console.log(`  [ERROR] step failed: ${e.message}`) }
}
console.log("\nSummary" + (apply ? "" : " (would-be changes)"))
for (const [s, st] of Object.entries(summary)) console.log(`  ${s.padEnd(12)} created ${st.created ?? 0}, updated ${st.updated ?? 0}, unchanged ${st.unchanged ?? 0}, errors ${st.errors ?? 0}`)
if (ctx.errors.length) { console.log(`\n${ctx.errors.length} error(s):`); for (const e of ctx.errors) console.log("  - " + e); process.exit(1) }

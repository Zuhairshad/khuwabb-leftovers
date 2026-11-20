#!/usr/bin/env node
// Khuwabb store setup (Admin GraphQL). See README.md.
import { parseArgs } from "node:util"
import { loadLocal, SHOPIFY_API_VERSION } from "./lib/data.mjs"
import { makeClient } from "./lib/api.mjs"
import { STEPS, DEFAULT_STEPS } from "./lib/steps.mjs"

const { values: f } = parseArgs({
  options: {
    plan: { type: "boolean" }, "dry-run": { type: "boolean" }, apply: { type: "boolean" },
    only: { type: "string" }, verbose: { type: "boolean" }, descriptions: { type: "boolean" }, files: { type: "boolean" }, help: { type: "boolean" },
  },
})
if (f.help) { console.log("node tools/store-setup/setup.mjs [--plan | --dry-run | --apply] [--only step,...] [--descriptions] [--files] [--verbose]\nSteps: " + Object.keys(STEPS).join(", ")); process.exit(0) }
if ([f.plan, f["dry-run"], f.apply].filter(Boolean).length > 1) { console.error("Choose only one of --plan, --dry-run, --apply"); process.exit(2) }

let steps = f.only ? f.only.split(",").map((s) => s.trim()) : [...DEFAULT_STEPS]
if (f.files && !f.only) steps.push("files")
const bad = steps.filter((s) => !STEPS[s])
if (bad.length) { console.error(`Unknown step(s): ${bad.join(", ")}. Valid: ${Object.keys(STEPS).join(", ")}`); process.exit(2) }
if (steps.includes("files") && !f.files && !f.only) steps = steps.filter((s) => s !== "files")

const local = loadLocal()
const store = process.env.SHOPIFY_STORE || "citbkj-yj.myshopify.com"
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
if (!token) { console.error("SHOPIFY_ADMIN_TOKEN is required for --dry-run / --apply (use --plan for an offline plan)."); process.exit(2) }
const apply = !!f.apply
console.log(apply ? "MODE: APPLY (writes enabled)" : "MODE: DRY-RUN (reads only; nothing is written)")
const ctx = { api: makeClient({ store, token, verbose: f.verbose }), local, apply, flags: f, verbose: f.verbose, errors: [], cache: {} }
const summary = {}
for (const s of steps) {
  console.log(`\n== ${s}`)
  try { summary[s] = await STEPS[s].run(ctx) } catch (e) { ctx.errors.push(`${s}: ${e.message}`); summary[s] = { errors: 1 }; console.log(`  [ERROR] step failed: ${e.message}`) }
}
console.log("\nSummary" + (apply ? "" : " (would-be changes)"))
for (const [s, st] of Object.entries(summary)) console.log(`  ${s.padEnd(12)} created ${st.created ?? 0}, updated ${st.updated ?? 0}, unchanged ${st.unchanged ?? 0}, errors ${st.errors ?? 0}`)
if (ctx.errors.length) { console.log(`\n${ctx.errors.length} error(s):`); for (const e of ctx.errors) console.log("  - " + e); process.exit(1) }

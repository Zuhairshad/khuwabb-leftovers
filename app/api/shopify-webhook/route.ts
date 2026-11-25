import { after } from "next/server"
import { verifySignature, shouldAct } from "@/lib/shopify-webhook"

// Shopify calls this when a product or its stock changes. The catalog is a
// build-time snapshot (scripts/sync-shopify.mjs runs on every build), so a
// change in Shopify only shows up on the site after a fresh deploy. This
// route's only job is to kick off that deploy, debounced so a burst of
// webhooks (Shopify fires one inventory_levels/update per variant) doesn't
// queue a pile of builds.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Wait this long after the first change before triggering, so a burst of
// edits lands in one build. Skipping changes that arrive *after* a trigger
// would be wrong: that build may already have synced, leaving them out.
const SETTLE_MS = 30_000

// One pending trigger per instance; reset on cold start. Bursts that span
// instances are caught by the Vercel API check below (if a token is set).
let pending: Promise<void> | null = null

async function recentDeploymentQueued(): Promise<boolean> {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!token || !projectId) return false
  try {
    const params = new URLSearchParams({
      projectId,
      target: "production",
      state: "QUEUED,INITIALIZING",
      limit: "5",
    })
    if (process.env.VERCEL_TEAM_ID) params.set("teamId", process.env.VERCEL_TEAM_ID)
    const res = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return false
    const json = await res.json()
    return Array.isArray(json.deployments) && json.deployments.length > 0
  } catch {
    // Vercel API unreachable: trigger anyway rather than risk a stale catalog.
    return false
  }
}

async function triggerDeploy(topic: string) {
  if (pending) {
    console.log(`shopify-webhook: ${topic} folded into the pending trigger`)
    return pending
  }
  pending = (async () => {
    await new Promise((r) => setTimeout(r, SETTLE_MS))
    // Clear first: anything arriving from here on starts a new cycle, so it
    // can't be missed by a build whose sync has already run.
    pending = null
    if (await recentDeploymentQueued()) {
      console.log(`shopify-webhook: skipped (a build is queued and hasn't synced yet)`)
      return
    }
    // Caller already confirmed VERCEL_DEPLOY_HOOK_URL is set before scheduling this.
    const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL as string
    try {
      const res = await fetch(hookUrl, { method: "POST" })
      console.log(`shopify-webhook: triggered deploy hook (status ${res.status})`)
    } catch (err) {
      console.error("shopify-webhook: deploy hook request failed", err)
    }
  })()
  return pending
}

export async function POST(req: Request) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET
  if (!secret) {
    console.error("shopify-webhook: SHOPIFY_WEBHOOK_SECRET is not set")
    return Response.json({ ok: false, error: "not configured" }, { status: 500 })
  }

  // Read the raw body before any parsing - the signature covers exactly these bytes.
  const rawBody = await req.text()
  const valid = verifySignature(rawBody, req.headers.get("x-shopify-hmac-sha256"), secret)
  if (!valid) {
    console.log("shopify-webhook: rejected (bad signature)")
    return Response.json({ ok: false, error: "invalid signature" }, { status: 401 })
  }

  const topic = req.headers.get("x-shopify-topic")
  if (!shouldAct(topic)) {
    console.log(`shopify-webhook: ignored topic ${topic ?? "(none)"}`)
    return Response.json({ ok: true, action: "ignored" })
  }

  // Without a hook URL nothing can be triggered - tell Shopify now rather
  // than claim "queued" and do nothing.
  if (!process.env.VERCEL_DEPLOY_HOOK_URL) {
    console.error(`shopify-webhook: ${topic} could not trigger - VERCEL_DEPLOY_HOOK_URL is not set`)
    return Response.json({ ok: false, error: "not configured" }, { status: 500 })
  }

  // Respond within Shopify's 5s limit; do the debounce check and the actual
  // trigger after the response is sent.
  after(() => triggerDeploy(topic!))

  return Response.json({ ok: true, action: "queued" })
}

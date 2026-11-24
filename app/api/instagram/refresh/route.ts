import { NextResponse } from "next/server"

// Weekly Vercel cron (vercel.json). A long-lived Instagram token expires 60
// days after it was issued or last refreshed; refreshing it here keeps the
// home-page feed alive without anyone touching it.
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  // Vercel sends `Authorization: Bearer $CRON_SECRET` with cron requests.
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) return NextResponse.json({ ok: false, reason: "INSTAGRAM_ACCESS_TOKEN is not set" })

  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  )
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: { message?: string } }
  if (!res.ok || !body.access_token) {
    console.error("instagram-refresh: failed", res.status, body.error?.message)
    return NextResponse.json({ ok: false, status: res.status }, { status: 502 })
  }
  if (body.access_token !== token) {
    // Never log the token itself. Instagram normally returns the same string
    // with a later expiry; if it ever doesn't, the env var needs the new one.
    console.warn("instagram-refresh: Instagram returned a different token; update INSTAGRAM_ACCESS_TOKEN in Vercel")
  }
  const days = body.expires_in ? Math.round(body.expires_in / 86400) : null
  return NextResponse.json({ ok: true, expiresInDays: days })
}

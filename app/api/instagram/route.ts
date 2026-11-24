import { NextResponse } from "next/server"
import { getInstagramPosts, INSTAGRAM_URL } from "@/lib/instagram"

// Public JSON of the latest Instagram posts. The Shopify theme's Instagram
// section can fetch this, so both storefronts show the same feed. Cached
// for 15 minutes.
export const revalidate = 900

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
}

export async function GET() {
  const posts = await getInstagramPosts()
  return NextResponse.json(
    { profile: INSTAGRAM_URL, posts: posts ?? [] },
    { headers: { ...CORS, "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
  )
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

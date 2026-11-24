// Latest Instagram posts and reels for the home-page feed (and, through
// /api/instagram, for the Shopify theme's copy of the same section).
//
// Reads a Behold.so JSON feed: connect the Instagram account at behold.so,
// create a JSON feed and put its link in BEHOLD_FEED_URL. Behold handles the
// Instagram login and keeps the feed fresh. Without the link (or if Behold is
// down) this returns null and the section shows the brand photos below
// instead, so the page never breaks. New posts show up within REVALIDATE
// seconds.

import { INSTAGRAM_URL } from "./site"

export { INSTAGRAM_URL }

export const REVALIDATE = 900

export type InstagramPost = {
  id: string
  kind: "image" | "video" | "carousel"
  /** Photo, or the cover frame of a reel. */
  image: string
  /** Reel video (mp4), when the post is one. */
  video: string | null
  /** The post on instagram.com. */
  href: string
  caption: string
  timestamp: string | null
}

type Size = { mediaUrl?: string }
type BeholdPost = {
  id: string | number
  permalink?: string
  mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM"
  mediaUrl?: string
  thumbnailUrl?: string
  sizes?: { small?: Size; medium?: Size; large?: Size; full?: Size }
  caption?: string
  prunedCaption?: string
  timestamp?: string
}

function toPost(p: BeholdPost): InstagramPost | null {
  const isVideo = p.mediaType === "VIDEO"
  // Behold's resized copies are images even for reels (the cover frame);
  // mediaUrl is the video itself for a reel.
  const image = p.sizes?.medium?.mediaUrl || p.sizes?.large?.mediaUrl || (isVideo ? p.thumbnailUrl : p.mediaUrl) || p.thumbnailUrl
  if (!image || !p.permalink) return null
  return {
    id: String(p.id),
    kind: isVideo ? "video" : p.mediaType === "CAROUSEL_ALBUM" ? "carousel" : "image",
    image,
    video: isVideo ? (p.mediaUrl ?? null) : null,
    href: p.permalink,
    caption: (p.prunedCaption || p.caption || "").trim(),
    timestamp: p.timestamp ?? null,
  }
}

export async function getInstagramPosts(limit = 12): Promise<InstagramPost[] | null> {
  const feedUrl = process.env.BEHOLD_FEED_URL
  if (!feedUrl) return null
  try {
    const res = await fetch(feedUrl, { next: { revalidate: REVALIDATE, tags: ["instagram"] } })
    if (!res.ok) {
      console.error(`Instagram feed: Behold responded ${res.status}`)
      return null
    }
    const data = (await res.json()) as BeholdPost[] | { posts?: BeholdPost[] }
    // Newer Behold feeds wrap posts in { posts: [...] }; older ones are a plain array.
    const raw = Array.isArray(data) ? data : (data.posts ?? [])
    const posts = raw
      .map(toPost)
      .filter((p): p is InstagramPost => p !== null)
      .slice(0, limit)
    return posts.length ? posts : null
  } catch (err) {
    console.error("Instagram feed: request failed", err)
    return null
  }
}

// Shown until the account is connected: the brand's own lookbook photos,
// each linking to the profile.
export const FALLBACK_POSTS: InstagramPost[] = [
  { slug: "looks/street-ready", alt: "Street ready look: black vinyl puffer with a two-stripe wide-leg trouser" },
  { slug: "looks/off-duty", alt: "Off duty look: olive cropped puffer with a cream high-waist jogger" },
  { slug: "wear-the-dream", alt: "Khuwabb campaign photo" },
  { slug: "looks/daily-edit", alt: "Daily edit look: beige cropped puffer gilet over a black ribbed trouser" },
  { slug: "looks/brunch-dates", alt: "Brunch dates look: maroon boat-neck maxi dress" },
  { slug: "collections", alt: "Khuwabb pieces on a clothes rail" },
].map(({ slug, alt }) => ({
  id: slug,
  kind: "image",
  image: `/brand/${slug}-640w.webp`,
  video: null,
  href: INSTAGRAM_URL,
  caption: alt,
  timestamp: null,
}))

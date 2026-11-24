// Latest Instagram posts and reels for the home-page feed (and, through
// /api/instagram, for the Shopify theme's copy of the same section).
//
// Reads the Instagram API with Instagram Login using a long-lived access
// token in INSTAGRAM_ACCESS_TOKEN. Without a token (or if Instagram is down)
// it returns null and the section shows the brand photos below instead, so
// the page never breaks. New posts show up within REVALIDATE seconds.

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

type Media = {
  id: string
  caption?: string
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM"
  media_url?: string
  thumbnail_url?: string
  permalink: string
  timestamp?: string
  children?: { data: { media_type: Media["media_type"]; media_url?: string; thumbnail_url?: string }[] }
}

const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}"

function toPost(m: Media): InstagramPost | null {
  // A carousel's own media_url is its first slide; if that slide is a video
  // the cover frame lives on the child, so look there.
  const first = m.media_type === "CAROUSEL_ALBUM" ? m.children?.data?.[0] : undefined
  const type = first?.media_type ?? m.media_type
  const src = first ?? m
  const isVideo = type === "VIDEO"
  const image = isVideo ? src.thumbnail_url : src.media_url
  if (!image) return null
  return {
    id: m.id,
    kind: m.media_type === "CAROUSEL_ALBUM" ? "carousel" : isVideo ? "video" : "image",
    image,
    video: isVideo && m.media_type === "VIDEO" ? (m.media_url ?? null) : null,
    href: m.permalink,
    caption: (m.caption ?? "").trim(),
    timestamp: m.timestamp ?? null,
  }
}

export async function getInstagramPosts(limit = 12): Promise<InstagramPost[] | null> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) return null
  const url = `https://graph.instagram.com/me/media?fields=${encodeURIComponent(FIELDS)}&limit=${limit}&access_token=${encodeURIComponent(token)}`
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE, tags: ["instagram"] } })
    if (!res.ok) {
      console.error(`Instagram feed: HTTP ${res.status}`, (await res.text()).slice(0, 300))
      return null
    }
    const body = (await res.json()) as { data?: Media[] }
    const posts = (body.data ?? []).map(toPost).filter((p): p is InstagramPost => p !== null)
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

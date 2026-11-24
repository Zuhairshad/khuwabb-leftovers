import { FALLBACK_POSTS, getInstagramPosts, INSTAGRAM_URL } from "@/lib/instagram"
import { InstagramStrip } from "./InstagramStrip"
import { SectionHeader } from "./SectionHeader"
import styles from "./InstagramFeed.module.css"

// The latest posts and reels from the brand's Instagram, edge to edge above
// the footer. A new post appears here on its own within ~15 minutes.
export async function InstagramFeed() {
  const posts = (await getInstagramPosts()) ?? FALLBACK_POSTS
  return (
    <section className={styles.section} data-section="instagram">
      <SectionHeader title="Follow the dream" cta={{ href: INSTAGRAM_URL, label: "Follow on Instagram" }} />
      <InstagramStrip posts={posts} />
    </section>
  )
}

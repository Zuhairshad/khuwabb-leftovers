# Parity: instagram-feed

Source: `components/home/InstagramFeed.tsx`, `InstagramStrip.tsx`, `InstagramFeed.module.css`, `lib/instagram.ts`, `app/api/instagram/route.ts` (khuwabb-leftovers, main).
Theme: `sections/instagram-feed.liquid`, `assets/instagram-feed.js` (custom element `<instagram-feed>`), `assets/section-instagram-feed.css`.

## CSS rules (InstagramFeed.module.css -> section-instagram-feed.css)

| Source | Theme selector |
|---|---|
| :1-8 `.section` (flex column, center, gap 56, width 100%, padding-top 120) | `.instagram-feed` |
| :12-22 `.strip` (flex, overflow-x auto, overscroll-x contain, snap x mandatory, scrollbar-width none) | `.instagram-feed__strip` (wrapped in `instagram-feed {display:block;width:100%}`) |
| :24-26 `.strip::-webkit-scrollbar` | `.instagram-feed__strip::-webkit-scrollbar` |
| :28-35 `.tile` (flex 0 0 calc(100%/6), 9/16, bg ink-line, snap start) | `.instagram-feed__tile` |
| :37-41 `.link` | `.instagram-feed__link` |
| :43-46 `.link:focus-visible` outline 2px ink, offset -4 | same, on `.instagram-feed__link` |
| :48-56 `.media, .video` | `.instagram-feed__media, .instagram-feed__video` |
| :60-65 `.video` opacity 0, fade .4s | `.instagram-feed__video` |
| :67-69 `.video[data-playing]` | `.instagram-feed__video[data-playing]` (set by JS on `playing`) |
| :71-79 `.badge` (16/16, white, drop-shadow) | `.instagram-feed__badge` |
| :81-90 `.hover` rgba(23,20,15,.28), .4s | `.instagram-feed__hover` |
| :92-98 `.glyph` 36px white mask `/icons/instagram.svg` | `.instagram-feed__glyph`, mask `var(--instagram-glyph)` set inline on the section from `icon-instagram.svg | asset_url` |
| :100-109 `@media (hover:hover)` scale 1.04 + hover opacity 1 | same |
| :111-113 `.link:focus-visible .hover` | same |
| :115-123 tablet 810-1199.98: padding-top 96, basis 25% | same media query |
| :125-139 mobile <=809.98: gap 32, padding-top 72, basis 100%/2.4, badge 10/10 | same media query |
| :141-152 reduced motion (transitions none, no hover scale) | same media query |
| Tokens `--ink --white --ink-line --ease-out` | same names in head-styles.liquid |

## Behaviour

| Source | Theme |
|---|---|
| `data-section="instagram"` | section root `<section>` |
| `SectionHeader` "Follow the dream" + CTA "Follow on Instagram" -> INSTAGRAM_URL | `section-heading` snippet; `heading`, `cta_label`, `profile_url` settings (blank profile -> `https://instagram.com`, same as INSTAGRAM_URL default) |
| `getInstagramPosts() ?? FALLBACK_POSTS` | Liquid renders fallback/manual tiles; JS fetches `feed_url` and swaps in live posts when `posts.length > 0` |
| FALLBACK_POSTS (6 brand photos, order, alts, href = profile) | Liquid loop over the same six assets (`*-640w.webp` src plus srcset from the existing widths), aria-label carries the alt text, link = profile_url |
| `/api/instagram` shape `{profile, posts[]}` | consumed by `instagram-feed.js`; `feed_url` setting (clear it to only show manual tiles) |
| Behold.so feed (new) | `feed_url` also accepts a Behold JSON feed (top-level array or `{ posts }`). `normalise()` detects `permalink`/`mediaType` and maps: image = `sizes.medium` / `sizes.large` / (VIDEO ? `thumbnailUrl` : `mediaUrl`) / `thumbnailUrl`; kind VIDEO->video, CAROUSEL_ALBUM->carousel, else image; video = `mediaUrl` for VIDEO; href = `permalink`; caption = `prunedCaption` or `caption`. Same safeUrl checks |
| 12 posts max | `limit` range 6-12 (default 12), `data-limit` |
| tile `<a>` target _blank, rel noopener noreferrer | same (Liquid + JS) |
| aria-label `Reel/Post on Instagram[: trimTo(caption, 90)]` | same; JS ports `trimTo` |
| `<img alt="" loading=lazy decoding=async>` | same |
| `Reel`: muted loop playsInline preload none aria-hidden, IO threshold .5 play/pause, `playing` -> data-playing | `addReel()` in JS, identical; also used for block tiles with `video_url` |
| Reduced motion: no video | `addReel()` returns early under `prefers-reduced-motion: reduce` (checked at build time) |
| Video only for `kind === "video"` posts | same (`normalise()`) |
| `ReelIcon` / `CarouselIcon` SVG (22px, stroke 1.6) | verbatim paths in Liquid (block tiles) and JS (`createElementNS`) |
| Badge shown when kind != image | same |
| Hover glyph span aria-hidden | same |
| Safety (new) | only http(s) URLs accepted; DOM built via createElement/textContent-equivalents, never innerHTML; fetch failure / empty feed leaves the fallback |
| Fetch timing (new) | IntersectionObserver rootMargin 400px, once |

## Not matched

- Manual blocks: aria-label is the generic "Post/Reel on Instagram" (no caption setting).
- Fallback `<img>` width/height attributes (640x1138) are nominal (theme-check requirement); `object-fit: cover` makes the real ratio irrelevant.
- `carousel` blocks show the badge only; `video` kind with no `video_url` shows the badge over the cover image.
- Live tiles load after hydration of the custom element (client fetch), unlike React's server render; the fallback shows first.

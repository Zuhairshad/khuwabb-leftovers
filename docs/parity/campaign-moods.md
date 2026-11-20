# Parity: campaign-moods ("Wear the dream")

Sources: `components/home/FreshDaily.tsx` (FD.tsx), `FreshDaily.module.css` (FD.css), `components/GelatoCounter.tsx` (GC.tsx), `GelatoCounter.module.css` (GC.css), `data/gelato-counter.json`, `lib/useMedia.ts`.
Theme: `sections/campaign-moods.liquid` (L), `assets/section-campaign-moods.css` (C), `assets/campaign-moods.js` (J). Prefix `cm` = `campaign-moods`. Breakpoints: phone `max-width:809.98px`, tablet `min-width:810px and max-width:1199.98px` (same as source).

## 1. CSS rules

| Source | Selector in C | Notes |
|---|---|---|
| FD.css:1-9 `.section` | `.campaign-moods` | flex col, center, gap 24, padding 40/0/140, overflow clip |
| FD.css:11-20 `.words` | `.campaign-moods__words` | |
| FD.css:22-30 `.word` | `.campaign-moods__word` | 120/600/.95/-.01em/pre; element is `<h2>` (G6) |
| (framer `m.div` wrapper, FD.tsx:34) | `.campaign-moods__word-wrap` / `<scroll-words>` | display block |
| FD.css:32-39 `.campaign` | `.campaign-moods__campaign` | |
| FD.css:41-46 `.counter` | `.campaign-moods__counter` | h 700 |
| FD.css:48-56 tablet | media block in C | word 84, counter 600 |
| FD.css:58-81 phone | media block in C | section 24/0/96, words column gap 0 pad 20, word 54, campaign pad 20, counter 900 |
| GC.css:1-8 `.root` | `.campaign-moods__root` (the `<campaign-moods>` element) | |
| GC.css:10-15 `.frame` | `.campaign-moods__frame` | |
| GC.css:17-21 `.clip` | `.campaign-moods__clip` | |
| GC.css:23-28 `.photo` | `.campaign-moods__photo` | plus no-JS placement (see Not matched) |
| GC.css:30-51 `.tag` | `.campaign-moods__tag` | `position:absolute` (wide; GC.tsx:110) / `relative` (narrow, GC.tsx:108) via `[data-narrow]`; opacity 0 base, 1 under `[data-revealed]` (GC.tsx:108,114) |
| GC.css:53-56 `.tag[data-on]` | `.campaign-moods__tag[data-on]` | |
| GC.css:58-63 `.dot` | `.campaign-moods__dot` | |
| GC.css:65-76 `.float` | `.campaign-moods__float` | |
| GC.css:78-84 `.float[data-shown]` | `.campaign-moods__float[data-shown]` | |
| GC.css:86-99 `.card` | `.campaign-moods__card` | width set inline by J (GC.tsx:139); 320px pre-JS default |
| GC.css:101-103 `.card[data-narrow]` | `.campaign-moods__root[data-narrow] .campaign-moods__card` | data-narrow is on the root (per brief), width 100% |
| GC.css:105-109 `.pieces` | `.campaign-moods__pieces` | |
| GC.css:111-117 `.tile` | `.campaign-moods__tile` | bg inline = mood colour |
| GC.css:119-123 `.tile img` | `.campaign-moods__tile img` | |
| GC.css:125-130 `.copy` | `.campaign-moods__copy` | |
| GC.css:132-138 `.name` | `.campaign-moods__name` | |
| GC.css:140-144 `.note` | `.campaign-moods__note` | |
| GC.css:146-151 `.buy` | `.campaign-moods__buy` | |
| GC.css:153-157 `.price` | `.campaign-moods__price` | |
| GC.css:159-170 `.cta` | `.campaign-moods__cta` | |
| GC.css:172-180 `.cta span` | `.campaign-moods__cta span` | |
| GC.css:182-188 `.chips` | `.campaign-moods__chips` | `display:none` until `[data-narrow]` |
| (GC.tsx:207-211 narrow card as direct child) | `.campaign-moods__stack` + `[data-narrow]` overrides | floats are moved here in narrow mode; static, only `[data-shown]` visible |
| (missing in source) reduced motion | `@media (prefers-reduced-motion: reduce)` | tag/float transitions off |

## 2. Formulas / constants

| Source | JS location (J) |
|---|---|
| GC.tsx:34 EASE | CSS transitions in C (same cubic-bezier) |
| GC.tsx:35 `clamp` | `clamp` top of J |
| GC.tsx:39-41 default box 1200x700, natural 1536x864, reveal 0 | `connectedCallback` state init |
| GC.tsx:45 `narrow = box.w < 700` | `measure()` |
| GC.tsx:46 `revealed = reveal > .92` | `renderReveal()` |
| GC.tsx:48-55 ResizeObserver on frame, clientWidth/Height | `connectedCallback` `this.ro` / `measure()` |
| GC.tsx:60-63 reduced motion -> reveal 1 | `connectedCallback` reduced branch |
| GC.tsx:66-79 rAF loop, target `clamp((vh-top)/(vh*.85),0,1)`, `eased += (t-e)*.08`, snap < .001, update guard 5e-4 | `target()`, `startLoop()` |
| GC.tsx:75 onScreen = `bottom>0 && top<vh` | IntersectionObserver in `connectedCallback` (improvement, see below) |
| GC.tsx:83-87 cycle `max(2,cycle)*1000`, deps hovering/revealed/onScreen/len>=2 | `syncCycle()` |
| GC.tsx:90-95 cover-fit, focusX clamp, imgY, `at()` | `layout()`, `at()` |
| GC.tsx:97-101 p, side (.08/.2), inner, round, clip string | `renderClip()` |
| GC.tsx:102 cardWidth `narrow ? w : min(320, w-32)` | `layout()` |
| GC.tsx:113 tag transform `translate(-50%,-100%) translateY(on?-8:0) rotate(on?0:i even?-4:3)` | `updateActive()` |
| GC.tsx:108,115 transitionDelay `0s, i*.08s, 0s, 0s` | inline style in L (`m_delay`) |
| GC.tsx:125-130 mouseenter (hover+select), focus, click | tag listeners in `connectedCallback` |
| GC.tsx:166 root `onMouseLeave` | `mouseleave` on `<campaign-moods>` |
| GC.tsx:176-179 onLoad natural size | `photo` `load` listener + `complete` check |
| GC.tsx:180 scale `1.08 - .08p` (toFixed 4) | `renderClip()` |
| GC.tsx:189-197 float shown/left clamp(16, w-cw-16)/bottom `h-y+64`/origin | `updateActive()` (shown) + `layout()` |
| GC.tsx:198 float onMouseEnter | float `mouseenter` listener |
| GC.tsx:183-212 narrow: chips row + one card | `setNarrow()` moves tags -> `[data-chips]`, floats -> `[data-stack]` |
| FD.tsx:30-32 scroll offset start end -> end end, x from->0, opacity .2->1 | `ScrollWords.update()`: `progress = clamp((vh - rect.top)/rect.height, 0, 1)` |
| FD.tsx:46-47 from -180 / 180 | `data-from` in L |
| FD.tsx:42,57 phone focusX 62 | `focusX()` via `matchMedia(max-width:809.98px)` |
| JSON radius 32 / cycle 4 / focusX 50 | section settings (see 4) -> `data-radius/-cycle/-focus-x` |

## 3. States

| State | Where |
|---|---|
| Before reveal | clip pre-set in C (`.js` rule) then J inline; tags opacity 0; floats hidden |
| Revealing | rAF loop in J; clip/radius/scale each frame |
| Revealed (> .92) | `data-revealed` on root -> tags fade in (stagger delay inline); active float gets `data-shown` |
| Auto-cycle | `syncCycle()`; only while revealed + on screen + not hovering |
| Hover pause | tag/float `mouseenter` sets hovering; root `mouseleave` resumes |
| Tag focus / click | `select(i)` -> `data-on` on tag, `data-shown` on float |
| Narrow chips mode | `data-narrow` on root; CSS in section 1 |
| Tablet / phone | media blocks in C; phone focus 62 via matchMedia |
| Reduced motion | J: reveal = 1 at once, no rAF/IO, scroll-words static end state; C: transitions off |
| Missing product | L: tiles use present products in order (tile2/3 fall back to first, FD.tsx:21-23); price blank if any of the 3 is missing |

## 4. Strings and settings

| Source | Theme |
|---|---|
| `Wear the` / `dream` (FD.tsx:46-47) | settings `word_1` / `word_2` |
| `Khuwabb campaign photo` (FD.tsx:53) | setting `image_alt` |
| `Shop the look` (JSON cta) | setting `cta_label` |
| `/shop` hardcoded link (FD.tsx:20) | setting `cta_link` (default `/collections/all`; blank -> `#` like `link \|\| "#"`) |
| photo `/brand/wear-the-dream.jpg` | setting `image`; blank -> 4 theme assets `wear-the-dream-{640,960,1280,1672}w.webp` srcset (L) |
| radius / focusX / cycle / mobile focus | settings `radius` / `focus_x` / `cycle` / `focus_x_mobile` |
| mood name, note, colour, x, y, 3 slugs | block `mood` settings `name` `note` `color` `x` `y` `product_1..3` |
| Card price | `{% render 'price' %}` of the sum of `product.price` |
| `sizes` `(max-width: 809px) 200vw, 1216px` | L `cm_img_sizes` |
| tile `alt=""`, lazy, async | L (cutout-image `decorative: true` -> `alt=""`), lazy |
| arrow svg `M4 10L10 4M5 4h5v5` | L (CTA badge) |
| tag `aria-label` = name | L |
| `data-section="fresh-daily"` | root `div.campaign-moods` |

No locale keys are needed: all copy is section settings.

## Improvements (documented deviations)

- rAF loop runs only while the frame is on screen (IntersectionObserver); when it leaves, the reveal snaps to its clamped target (the source polls forever). Same for scroll-words (scroll listener only while visible).
- Words are per-word `<scroll-words>` (as the source's per-Word target), not one element for both.

## Not matched

- `onScreen`/auto-cycle under reduced motion: source never sets onScreen there, so no cycling; kept (also calmer).
- Image placement before JS/with JS off: `object-fit: cover; width/height 100%` is added to `.photo` (source has none); inline JS values override it once running, so the result is identical when the image aspect equals natural size.
- Missing product price: source sums only the present products (and prints Rs.0 if none); the brief asks for blank if any is missing, so that is what the theme does.
- Tile images use `cutout-image` `decorative: true`, giving `alt=""` as in the source (no placeholder/replace workaround).
- Phone focus uses the source's viewport media query (810px), not the frame-width `narrow` flag from the brief; they differ only for viewports 740-809px.
- Card layout in narrow mode moves the same DOM nodes instead of re-rendering one card (visually identical); a focused tag loses focus if the viewport crosses the 700px threshold.
- The placeholder `clip-path` before JS (`.js .campaign-moods__clip`) uses `round 50% 50% 32px 32px`, not the exact per-frame pixel values (they depend on measured width).
- Pre-hydration SSR state in the source is a fully clipped photo; without JS the theme shows the same placeholder only if `html.js` is set, otherwise the full photo.

# Parity: new-arrivals (home hanger ticker)

Sources: `components/home/NewIn.tsx`, `NewIn.module.css`, `components/Ticker.tsx`, `components/new-in/NewInPage.module.css`.
Files: `sections/new-arrivals.liquid`, `snippets/hanger-card.liquid`, `assets/component-hanger-card.css`, `assets/section-new-arrivals.css`, `assets/ticker.js`.

## NewIn.module.css

| Source | Theme |
|---|---|
| `.section` :1-9 (flex column, centre, gap 56, w100%, padding `120px 0 140px`, overflow clip) | `section-new-arrivals.css` `.new-arrivals` |
| `.rack` :11-15 | `.new-arrivals__rack` |
| `.rail` :17-27 (abs, z0, top 13, l/r 0, h5, r999, gradient, shadow `0 2px 4px #17140f26`) | `.new-arrivals__rail` (aria-hidden div) |
| `.ticker` :29-37 (rel, z1, flex, w100%, padding `0 0 24px`, overflow clip, touch-action pan-y) | `.new-arrivals__ticker` (the `<marquee-ticker>`) |
| `.list` :39-43 (flex, gap 28, width min-content) | `.new-arrivals__list` |
| `.hanger` :45-50 (flex col, centre, w250) | `component-hanger-card.css` `.hanger-card`, `.hanger-card--ticker` |
| `.hanger svg` :52-55 | `.hanger-card__hook` |
| `.card` :57-66 (250x300, padding 22, radius 24, overflow clip, centred) | `.hanger-card__card` |
| `.card img` :68-73 | `.hanger-card__card img` |
| `.info` :75-80 | `.hanger-card__info` |
| `.info p` :82-90 (font-body 16/500, lh 20.8px, ls -0.08px, ink, pre) | `.hanger-card__name, .hanger-card__price` |
| `.info .name` :92-98 (flex 1 0 0, width 1px, ellipsis) | `.hanger-card__name` |
| `@media (max-width: 809.98px)` :100-105 (gap 40, padding `80px 0 96px`) | `section-new-arrivals.css` same query on `.new-arrivals` |

## NewIn.tsx / Ticker.tsx behaviours

| Source | Theme |
|---|---|
| `data-section="new-in"` | `<section class="new-arrivals" data-section="new-in">` |
| Header "New arrivals" + CTA "Shop new in" -> /new-in | `section-heading` snippet; settings `heading`, `cta_label`, `cta_link` (template value `/collections/new-in`; blank falls back to the collection URL) |
| `products.filter(newIn).slice(0,14)`, catalog order | `collection` (template `new-in`) products `limit: section.settings.limit` (4-20, default 14), collection sort order |
| `Hook()` svg, viewBox 0 0 120 62, 120x62, both paths, stroke #17140F 3, round cap/join | hanger-card.liquid inline SVG, identical paths (aria-hidden) |
| Card bg `p.tint ?? "#09F"` | inline `style="background"` from `product.metafields.custom.tint.value`, fallback `#09F` (ticker) |
| Image `atLeast(src,360)`, alt = name, lazy, async decode, draggable false | `cutout-image` (front, first colour, widths 360/480/640, sizes `206px`, lazy, alt="" (decorative, see Not matched); image_tag adds async decoding); `pointer-events:none` on img |
| `draggable={false}` on anchor | `draggable="false"` on the link |
| Link `/products/<slug>` | `product.url` |
| `formatPrice` | `price` snippet |
| whileHover rotate 5, originY 0, spring bounce .55 / 1.1s | `.hanger-card:hover` (`@media (hover: hover)`) and `:focus-visible`: `transform: rotate(5deg)`, `transform-origin: 50% 0`, `transition: transform 1.1s var(--spring-hanger)` |
| `velocity=34` | `data-speed` from setting `speed` (10-80 px/s, default 34) |
| `gap=28` | `data-gap="28"`; `.new-arrivals__track` gap 28 |
| `hoverFactor=0` | `data-hover-factor` = 0 when `pause_on_hover` else 1; mouseenter/mouseleave on the element |
| measure: setLength = set offsetWidth; copies = max(1, ceil(rootW/(len+gap))); ResizeObserver on set + root | `MarqueeTicker.measure()`, RO on `[data-ticker-measure]` and the element |
| rAF `offset -= delta/1000 * velocity * factor`, skipped while dragging | `tick()` (delta capped at 100 ms) |
| `wrap(-setLength - gap, 0, v)` | `wrapped()` same modular wrap, applied as `translate3d(x,0,0)` on the track |
| Copies `<li aria-hidden>` | cloned `<li data-ticker-clone aria-hidden="true">`, links get `tabindex="-1"` (a11y improvement) |
| Pointer down/move/up, 6px threshold, pointer capture after threshold, no momentum | same handlers on the element |
| `onClickCapture` swallow after real drag | capture-phase `click` listener, `justDragged` reset on swallow and on next pointerdown |
| `ul` styles (flex, gap, margin 0, padding 0, no list style) | `.new-arrivals__track` |

## States

| State | Behaviour |
|---|---|
| Autoplay | leftward at `speed`, starts on connect |
| Hover (mouse) | factor 0 (paused) if `pause_on_hover`; resumes on leave |
| Drag | after 6px, offset follows the pointer, autoplay frozen while pointer is down |
| Click after drag | swallowed once |
| Off-screen | (improvement) IntersectionObserver pauses; the source ran always |
| Tab hidden | (improvement) paused, timestamp reset so no jump on return |
| Reduced motion | (improvement) no autoplay, still draggable; hover swing disabled |
| Keyboard focus (focus-visible) inside | (improvement) autoplay paused, focused card scrolled into view; resumes when focus leaves |
| Phone | only the section gap/padding change; `touch-action: pan-y` keeps vertical scroll |

Strings: "New arrivals", "Shop new in" are section settings defaults (schema); no locale keys.

## Not matched

- Hanger spring: CSS `linear()` approximation (`--spring-hanger`) used in both directions; framer uses its default spring for the un-hover return.
- Hover swing only under `(hover: hover)` for `:hover` (framer whileHover ignores touch as well); `:focus-visible` swing is new.
- Intentional improvement: card image has `alt=""` (decorative; source used alt = name, which a screen reader reads twice next to the visible name in the same link; mapping G15). Implemented with `cutout-image` param `decorative: true` (no placeholder/replace workaround).
- Section `cta_link` and `collection` have no schema defaults (Shopify disallows them); the template JSON supplies them.
- Ticker not re-attachable after disconnect/reconnect of the same element (section re-render creates a new element, so fine).

## For task 3D (collection hanger grid)

`hanger-card` with `context: 'grid'` already gives: width 100%, align/justify-self start, pointer cursor, card width 100%, name wrapping (no ellipsis), no tint fallback. The page must add:
- Load `component-hanger-card.css`.
- Section root `data-section="new-in-grid"` wrapping the grid (NewInPage.tsx:35).
- `.grid` (NewInPage.module.css:67-75): `display:grid; grid-template-columns: repeat(4, minmax(220px,1fr)); grid-auto-rows: minmax(0,1fr); gap: 64px 28px; justify-content:start; width:100%; max-width:1216px`.
- Breakpoints: `min-width:810px and max-width:1199.98px` -> 3 columns `minmax(200px,1fr)`; `max-width:809.98px` rules (read NewInPage.module.css:157+ for the phone columns/gaps). Phone info column (NewInPage.module.css:195-205: `.info` column gap 2, `.name` flex none width 100%) lives in component-hanger-card.css under `.hanger-card--grid` in `@media (max-width: 809.98px)`; ticker context untouched.
- Pass `sizes` suited to the column width if different from the default `(max-width: 809.98px) 90vw, 280px`.
- No ticker.js, no rail.

## QA Q3 addition (M6): ticker.js

`assets/ticker.js` `syncLoop()`: the rAF loop starts only while the ticker is on screen (IntersectionObserver), the tab is visible (`visibilitychange`) and reduced motion is off; it is cancelled otherwise and re-armed on each of those changes. `tick()` is unchanged while running, so visible behaviour is identical. Drag still renders directly.

## QA E2 addition

`sections/new-arrivals.liquid` schema: `collection` setting gains `info` "Pick after adding the section — presets can't include products/collections."

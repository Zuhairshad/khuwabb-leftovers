# Parity: category-cards ("Find your fit")

Source: `components/home/Flavours.tsx`, `Flavours.module.css`, `SectionHeader.tsx`, `Appear.tsx`.
Theme: `theme/sections/category-cards.liquid` (S), `theme/assets/section-category-cards.css` (C), `theme/assets/category-cards.js` (J).
Spring `{bounce .15, duration .9}` = `.9s var(--spring-cards)` (tokens.css).

## CSS rules (Flavours.module.css)

| Source | Theme |
|---|---|
| `.section` 1-9 (flex column, centre, gap 48, 100%, padding 136px 0 120px, overflow clip) | C `.category-cards` |
| `.scoops` 11-16 (flex, 100%, max 1280, padding 0 32) | C `.category-cards__scoops` (also carries `data-appear="lift"`, S) |
| `.row` 18-24 (flex, centre, gap 12, 100%, h 560) | C `.category-cards__row` (the `<category-cards>` element) |
| `.card` 26-39 (relative, flex column, end/start, flex 1 0 0, w 1px, h 100%, padding 24, clip, radius 28, pointer) | C `.category-cards__card` (+ `text-decoration: none` for the anchor) |
| `.card[data-open]` 41-43 flex 2.6 | C `.category-cards__card[data-open]` |
| `.piece` 45-51 | C `.category-cards__piece` |
| `.cutout` 53-60 (h 44%, w auto, max-width calc(100% - 32px)) | C `.category-cards__cutout` |
| `.cutout[data-wide]`, `.card[data-open] .cutout[data-wide]` 62-65, 71-74 | Not matched (see below) |
| `.card[data-open] .cutout` 67-69 h 78% | C `.category-cards__card[data-open] .category-cards__cutout` |
| `.cutout img` 76-82 | C `.category-cards__cutout img` |
| `.caption` 84-93 | C `.category-cards__caption` (+ opacity, below) |
| `.name` 95-106 | C `.category-cards__name` (+ `margin: 0` reset) |
| `.count` 108-113 | C `.category-cards__count` |
| `.count p` 115-122 | C `.category-cards__count p` |
| `.side` 124-139 (bottom 211, left -163, w 400, rotate -90, ...) | C `.category-cards__side` (values kept) |
| `@media (max-width: 1199.98px)` 144-182: row column/auto; card flex none, 100% x 300; piece bottom 64; cutout 86%; side none; name 20/21/-0.1 | C same media query, same selectors renamed |
| `@media (max-width: 809.98px)` 184-193: section gap 36 / padding 112px 0 80px; scoops padding 0 20 | C same media query |

## Behaviour (Flavours.tsx)

| Source | Theme |
|---|---|
| `open` starts as first SHOWN card (L38) | S: first rendered (non-hidden) card gets `data-open` server-side (no flash); J `connectedCallback` re-asserts if none |
| `mouseenter` sets open, no mouseleave (L62) | J `onEnter` (capture `mouseenter` on the element); never closes on leave |
| Focus/tap: none in source | Improvement: J `onFocus` opens on `focusin` when `:focus-visible` |
| `data-open`, `data-card={c.name}` hooks (L59-60) | S `data-open`, `data-card="{{ title }}"` on the `<a>` |
| `animate flexGrow` 1 / 2.6 / 0 stacked (L57) | C `.category-cards__card` `transition: flex-grow .9s var(--spring-cards)`; `[data-open]` flex 2.6; stacked: `flex: none`, transition none |
| cutout height 44% / 78% / 86% stacked (L71) | C `.category-cards__cutout`, `[data-open] .cutout`, media query, each with `.9s` spring on `height` |
| tilt = `tilt * (open && !stacked ? 6 : 4)` (L50) | S `--tilt` (block `tilt`, -1/1) on the card; C `rotate(calc(var(--tilt) * 4deg))`, open `* 6deg`, stacked `* 4deg`; transition on `transform` |
| aspect-ratio from image ratio (L69) | S inline `aspect-ratio` = width/height of the cover colour's `front` media (alt `<Colour> \| front`, else `featured_media`; 0.8 if no product, or if the media has no preview_image width/height; ratio = `preview_image.aspect_ratio`, used only when > 0, never 0; no division) |
| caption opacity `shown ? 1 : 0` (L76) | C `.category-cards__caption` 0, `[data-open]` 1, stacked always 1; `.9s` spring |
| side label opacity `shown ? 0 : 1`, aria-hidden (L84) | C `.category-cards__side` 1 / `[data-open]` 0; stacked `display: none`; S `aria-hidden="true"` |
| `stacked` via useMedia (JS) | C media query `max-width: 1199.98px` only, no JS, no flash |
| Cover image `responsive(image)`, `sizes`, `alt=""`, lazy (L73) | S `cutout-image` (view front, sizes `(max-width: 809px) 45vw, (max-width: 1199px) 30vw, 360px`, `decorative: true` (alt=""; source used alt="" too, now guaranteed since cutout-image no longer falls back to a generated alt for a blank one), default lazy) |
| Count `{n} piece(s)` (L80) | S `{{ 'general.piece' \| t: count: collection.products_count }}` (locale already has one/other); no collection set: pill omitted |
| Empty category hidden (L33) | S: card skipped when the collection is set and `products_count == 0` |
| `href="/shop"` (L54) | S `block.settings.link \| default: '/collections/all'` |
| Tint `style.background` (L61) | S inline `background` from block `tint` |
| Appear `lift` on row (L45) | S `data-appear="lift"` on `.category-cards__scoops`; base.css + appear.js |
| SectionHeader (L44) | S `render 'section-heading'`; loads `component-section-heading.css` + `component-arrow-button.css` |

## States

| State | Where |
|---|---|
| Load | First card open via SSR attribute; row enters via `[data-appear="lift"]` |
| Hover each card (>=1200) | J opens it, others close; CSS springs flex-grow, height, tilt, caption/side crossfade |
| Keyboard focus | J `focusin` + `:focus-visible` opens the card |
| Stacked tablet (810-1199.98) / phone (<=809.98) | C media queries: column, 300px tiles, captions on, no side label, no transitions, `data-open` has no visual effect |
| Reduced motion | C `prefers-reduced-motion: reduce` removes all transitions (and base.css handles Appear) |

## Strings

| Text | Location |
|---|---|
| "Find your fit" | S setting `heading` |
| "All collections" | S setting `cta_label` |
| CTA href `/shop` | S setting `cta_link` (template sets `/collections/all`) |
| Card names | S block `title` |
| "piece"/"pieces" | locale `general.piece` |

## Not matched

- Wide variant (`data-wide`, `Category.wide`): no card uses it, so it is not ported. It would need a block checkbox plus width 92% / 70% / 66% rules.
- Source `will-change`/framer inline styles: not needed with CSS transitions.
- Spring is the shared `linear()` approximation (token), not a true physics spring; the flex-grow overshoot is therefore approximate.
- Aspect ratio comes from the image's original size at render time; source used precomputed catalog ratios (same data, different origin).
- Section wrapper uses `tag: div` plus inner `<section>`, so the section root `data-section="flavours"` is on the inner element per contract 1.1.

## Q4 QA fixes (E2)
Product/collection picker settings now carry info "Pick after adding the section — presets can't include products/collections." (schema text only).

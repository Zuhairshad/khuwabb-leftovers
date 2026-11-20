# Parity: Shop the look (components/home/Looks.tsx + Looks.module.css)

Files: `theme/sections/shop-the-look.liquid`, `theme/assets/section-shop-the-look.css`, fallback photos `theme/assets/look-{daily-edit,off-duty,street-ready,brunch-dates}-{400,640,960}w.webp`.
Reused: `snippets/section-heading` (+ css), `arrow-button` (+ css), `cutout-image`, `price`. Breakpoints: tablet `810px-1199.98px`, phone `max-width: 809.98px` (same as source). CSS prefix `.shop-the-look` (`__` elements).

## CSS rules (Looks.module.css line -> theme selector, all in section-shop-the-look.css)
| Source | Theme selector | Notes |
|---|---|---|
| 1-8 `.section` | `.shop-the-look` | flex column, centre, gap 48, padding 120px 0 |
| 10-17 `.list` | `.shop-the-look__list` | gap 40, max 1280, padding 0 32px |
| 19-30 `.look` | `.shop-the-look__look` | sticky top 96, gap 40, h 640, pad 24, `overflow: clip`, radius 32, shadow `0 -12px 40px #17140f0f` |
| 32-38 + 40-43 `.photo` (both blocks merged) | `.shop-the-look__photo` | 470 wide, radius 22, bg `rgba(255,255,255,.42)`, overflow clip |
| 45-53 `.lookPhoto` | `.shop-the-look__photo-img` | abs inset 0, cover, `50% 30%`, radius 22 |
| 55-113 `.outfit`, `.layer*` | not carried | see Not matched |
| 115-121 `.total` | `.shop-the-look__total` | + `margin: 0` (p reset) |
| 123-132 `.details` | `.shop-the-look__details` | space-between, flex `1 0 0`, width 1px, padding `24px 24px 16px 0` |
| 134-139 `.intro` | `.shop-the-look__intro` | |
| 141-148 `.name` | `.shop-the-look__name` | 64/64, 600 (renders 500), ls -0.01em; `margin: 0` |
| 150-158 `.description` | `.shop-the-look__description` | max 460, 20px, 1.45, ls -.01em, `--ink-62` |
| 160-165 `.pieces` | `.shop-the-look__pieces` | gap 10 |
| 167-177 `.piece` | `.shop-the-look__piece` | pad 10, gap 16, radius 20, bg `#ffffff8c`, blur 10 (+ -webkit-); added `color: inherit; text-decoration: none` (anchor reset) |
| 179-188 `.thumb` | `.shop-the-look__thumb` | 72x72, radius 14, `--white` |
| 190-194 `.thumb img` | `.shop-the-look__thumb img` | 60x60 contain |
| 196-202 `.text` | `.shop-the-look__text` | |
| 204-212 `.pieceName, .price` | `.shop-the-look__piece-name, .shop-the-look__price` | 16/500/20.8/-0.08px |
| 214-216 `.price` | `.shop-the-look__price` | `white-space: pre` |
| 218-224 `.colour` | `.shop-the-look__colour` | 14/500/19.6 |
| 226-230 `.actions` | `.shop-the-look__actions` | flex gap 12 |
| 232-245 tablet | `@media (min-width: 810px) and (max-width: 1199.98px)` | photo 320, description 19, name 52/52 |
| 247-287 phone | `@media (max-width: 809.98px)` | section gap 36 / pad 80px 0; list gap 24 / pad 0 20; look column gap 20 h auto pad 16; photo 100% x 360; details flex none, flex-start, gap 20, w 100%, h auto, pad `0 8px 8px`; name 38/38; description 17 |

## Looks.tsx behaviour / strings
| Source | Theme |
|---|---|
| `<section id="looks" data-section="looks">` | `sections/shop-the-look.liquid` root `<section id="looks" data-section="looks">` |
| `<SectionHeader title="Shop the look" />` (no CTA) | `render 'section-heading'` with setting `heading` (default "Shop the look"), no cta params |
| one `<article>` per look, `style background: tint` | one per `look` block; inline `background: {{ tint }}` (setting `tint`) |
| `data-look={look.slug}` | `data-look="{{ block.id }}"` (slug has no equivalent; see Decisions) |
| photo `img` responsive srcset, sizes `(max-width: 809px) calc(100vw - 72px), (max-width: 1199px) 320px, 470px`, lazy/async, alt `imageAlt` | `image` setting via `image_url`/`image_tag` widths 400/640/960 with the same sizes, lazy, async, alt `image_alt`; else the `fallback_image` asset srcset (same sizes, 960x1200) |
| `<h2>` name, `<p>` description | `<h2 class="__name">{{ title }}`, `<p class="__description">` |
| piece link `productHref?colour=encodeURIComponent` | `{{ product.url }}?colour={{ colour \| url_encode }}` |
| thumb img alt `<name> in <colour>`, lazy | `cutout-image` front view of that colour, `alt: "<title> in <colour>"`, widths 120/240/360, sizes 60px, lazy |
| piece name / colour / `formatPrice` | `product.title` / colour setting / `render 'price'` |
| ArrowButton `Shop all` -> `/shop` | `render 'arrow-button'`, `cta_label` (default Shop all), `cta_link` (default /collections/all; `/shop` has no Shopify equivalent) |
| `The look · {formatPrice(total)}` | `{{ total_label }} · {% render 'price' %}` (setting `total_label`, default "The look") |
| total only when all remaining prices are numbers | shown when >=1 piece exists and no slot has a colour but a blank product; sum of `product.price` |
| missing product dropped from `pieces` | slot with blank product skipped (no row) |

## States
- Desktop (>=1200): cards 640px tall, sticky top 96 so each following card slides over the previous (list is flex column, gap 40; no overflow on `.shop-the-look`, `__list`, section wrapper).
- Tablet: photo 320, smaller name/description.
- Phone: card becomes a column (photo 360 high above details), height auto; cards still sticky (as in source).
- Missing product: row skipped; total suppressed only if a colour was entered for the missing slot.
- Missing image (no `image`, `fallback_image` none/blank): empty `.photo` box with the translucent bg (source would draw the `.outfit` collage).
- No hover/focus/animation rules exist in the source for this section (arrow-button states come from component-arrow-button.css).

## Not matched
- `.outfit`, `.layer`, `.layer img`, `[data-layout]` / `[data-role]` rules (Looks.module.css 55-113) and the `Outfit` component: dead fallback (every shipped look has a photo); skipped per task. Missing image shows an empty tinted box instead.
- `data-look` carries `block.id`, not the look slug (blocks have no slug setting).
- `url_encode` turns a space into `+`, `encodeURIComponent` into `%20`; the PDP reads `?colour=` via URLSearchParams so both decode identically.
- Piece/thumb images rely on product media alt convention (`<Colour> | front`); fallback chain is in `cutout-image`.
- Source `.look`/`.photo` have no explicit link text colour on `.piece`; added `color: inherit; text-decoration: none` because the theme anchors may be styled by base.css.

## Q4 QA fixes
- Piece thumbnails use `decorative: true` (A11): piece name is visible text in the same link. Unused `piece_alt` assign removed.
- Product pickers product_1..3 carry info "Pick after adding the section — presets can't include products/collections." (E2)

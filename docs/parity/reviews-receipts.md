# Parity: reviews-receipts ("Seen on you")

Source: `components/home/Receipts.tsx`, `Receipts.module.css`, `data/receipts.json`, `components/Appear.tsx`.
Theme: `sections/reviews-receipts.liquid`, `assets/section-reviews-receipts.css` (CSS), `assets/receipts.js` (`<receipt-drag>`).
Class mapping: `.x` -> `.reviews-receipts__x` (`lineName` -> `line-name`).

## CSS rules (Receipts.module.css -> section-reviews-receipts.css)

| Source | Theme selector |
|---|---|
| :1-8 `.section` | `.reviews-receipts` |
| :10-19 `.title` (64/64, 600, -.01em, pre) | `.reviews-receipts__title` |
| :21-29 `.row` | `.reviews-receipts__row` |
| :31-37 `.receipt` (flex column, none, 340px, cursor grab) | split: `.reviews-receipts__slot` (flex none, 340px), `receipt-drag.reviews-receipts__slot` (cursor grab), `.reviews-receipts__receipt` (flex column, width 100%) |
| :39-47 `.paper` | `.reviews-receipts__paper` |
| :49-55 `.head` | `.reviews-receipts__head` |
| :57-63 `.brand` | `.reviews-receipts__brand` |
| :65-72 `.order, .by` | `.reviews-receipts__order, .reviews-receipts__by` |
| :74-78 `.dash` / :80-85 `::after` (`#17140f4d` dashed) | `.reviews-receipts__dash` / `::after` |
| :87-91 `.line` | `.reviews-receipts__line` |
| :93-99 `.line p` | `.reviews-receipts__line p` |
| :101-105 `.line .lineName` | `.reviews-receipts__line .reviews-receipts__line-name` |
| :107-111 `.total p` | `.reviews-receipts__total p` |
| :113-116 `.stars`, :118-121 `.stars svg` | `.reviews-receipts__stars`, `.reviews-receipts__stars svg` |
| :123-130 `.quote` | `.reviews-receipts__quote` |
| :132-136 `.tear` | `.reviews-receipts__tear` |
| :138-147 tablet 810-1199.98: title 52/52, quote 19 | same media query, `__title`, `__quote` |
| :149-172 phone <=809.98: section gap 40 / padding 80 20 56, title 38/38, row gap 28, receipt width 100% max 340, quote 17 | same media query; `.receipt` width/max-width on `__slot` |

## Markup / behaviour

| Source | Theme |
|---|---|
| `data-section="receipts"` | `<section class="reviews-receipts" data-section="receipts">` |
| `<Appear preset="rise">` h2 "Seen on you" | `<h2 data-appear="rise">` (base.css + appear.js), text = setting `heading` (default "Seen on you"); Appear's wrapper div omitted (no layout effect in the flex column) |
| `receipts.map`, 3 draft receipts | `receipt` blocks (max 6), presets = 3 receipts |
| `khuwabb` brand literal | section setting `brand` |
| `r.order` | block `order_text` |
| `r.lines` slugs -> product name/price; missing product skipped | block `product_1`, `product_2`; each rendered only if set; title `{{ product.title }}`, price `{% render 'price' %}` |
| Total = sum of present line prices (0 when none) | Liquid `rr_total`, `price` snippet (Rs.0 when none) |
| "Total" string | literal in section (also in source as literal) |
| Stars x5, `aria-label="5 stars"` | `locales accessibility.stars`; added `role="img"` so the label is valid ARIA |
| Star path/transform/stroke, 18px, viewBox 24 | inline svg, exact `d`, `translate(2.251 2.25)` |
| `r.quote`, `r.by` | block `quote` (textarea), `byline` |
| Tear svg viewBox `0 0 340 14`, preserveAspectRatio none, path, fill #FFFFFF | verbatim |
| `style={{ rotate: r.tilt }}` | block `tilt` range -5..5 step .5 -> `--tilt` -> `rotate: var(--tilt)` on `__receipt` |
| `DELAYS [.15,.33,.51]` | `--delay` = .15 + .18 x index (rounded 2dp) inline; continues +.18 for blocks 4-6 |
| m.div hidden `{opacity 0, y -80}` -> shown, spring bounce .25 / 1.4s, same transition both directions | CSS `.js .reviews-receipts__receipt[data-appear="receipt"]` (opacity + `translate: 0 -80px`) and `[data-shown]`, `transition: ... 1.4s var(--spring-receipt) var(--delay)` |
| `whileInView`, `viewport.amount .25`, replay on exit | `data-appear-amount="0.25"` + appear.js (toggles `data-shown` both ways) |
| `drag`, `dragMomentum`, no bounds | `<receipt-drag>` wraps each receipt when setting `draggable` (default true); else plain div |
| `whileTap cursor grabbing`, `cursor: grab` | `receipt-drag` cursor grab; `.is-dragging` cursor grabbing + user-select none |
| framer inertia | `receipts.js` `_momentum`: power .8, timeConstant 700ms, rest delta .5px, velocity from last 100ms |
| Draft reviews (G8) | block `paragraph` setting warning they are placeholders |

## States

| State | Handling |
|---|---|
| Before reveal / no JS | no `.js`: visible static. `.js` + no reduced motion: opacity 0, translateY(-80px), tilt kept |
| Revealed / replay | `data-shown` toggled by appear.js; delay applies in both directions as in source |
| Drag | slot `translate` set by JS (outside the rotate); grabbing cursor; no bounds |
| Momentum | decays after release; stops on next pointerdown |
| Tablet / phone | media queries above |
| Reduced motion | entrance rules wrapped in `no-preference` -> static and visible; drag follows pointer, no momentum on release |
| Missing product | line omitted, total sums the rest |
| Keyboard | element never focusable, no key handlers (source: same, no trap) |

## Improvements over source (intentional)

- 6px drag threshold before drag starts.
- Touch: `touch-action: pan-y` on the slot, so vertical page scroll over a receipt is never blocked (on touch drag is effectively horizontal; vertical swipes scroll). Source blocks scroll over receipts (framer sets touch-action none). Mouse/pen drag is fully 2D.
- Reduced motion handled (source has none).
- `pointercancel` ends the drag without throwing.

## Not matched

- Spring is CSS `linear()` approximation of framer's spring (tokens.css), opacity follows the same curve (clamped), so a faint difference vs framer's opacity spring is possible.
- Free vertical touch drag (see above; trade-off, decision below).
- Appear wrapper `div` around the h2 omitted (attributes sit on the h2).
- Product `price` is the Shopify current variant price (cents), source uses catalog price; identical for normal products.

## Decisions needed

- Touch drag: keep `pan-y` (recommended) or switch to `touch-action: none` for full 2D touch drag with scroll lock over receipts.
- G8: keep, hide or replace draft reviews.

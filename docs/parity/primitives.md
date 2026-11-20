# Parity: shared primitives (Batch 1, task 1A)

Source = React/CSS modules; theme paths relative to `theme/`.

## ArrowButton (`components/ArrowButton.tsx`, `ArrowButton.module.css`)
CSS is NOT emitted by the snippet. Sections must load `component-arrow-button.css` (documented in the snippet header).

| Source | Theme |
|---|---|
| ArrowButton.tsx:9 `m.a` href, `data-tone`, default "dark" | `snippets/arrow-button.liquid` `<a class="arrow-button" data-tone>`; params href/label/tone/class/attrs |
| tsx:10 label span | `.arrow-button__label` |
| tsx:11 icon span, rotate 0 -> 45 on hover, spring bounce .2 / .5s | `.arrow-button__badge` + `:hover`/`:focus-visible` `transform: rotate(45deg)`, `transition: transform .5s var(--spring-arrow)` (component-arrow-button.css) |
| tsx:18-24 ArrowUpRight svg 24 viewBox, size 18, stroke 1.5, round caps, 2 paths | inline svg in snippet (exact paths), `width/height=18` |
| css:1-12 `.button` flex/center/gap 10/height 52/padding 0 8px 0 24px/radius 999/bg ink/color paper/nowrap | `.arrow-button` |
| css:14-17 light tone: bg white, color ink | `.arrow-button[data-tone="light"]` |
| css:19-25 `.label` body font 16/500/20.8px/-0.08px | `.arrow-button__label` |
| css:27-36 `.icon` 38x38, 999, flex center, bg paper, color #000 | `.arrow-button__badge` (arrow stays #000 on both tones: G11) |
| css:38-40 light badge bg ink | `.arrow-button[data-tone="light"] .arrow-button__badge` |
| svg size 18 | `.arrow-button__badge svg` 18px |

## SectionHeader (`components/home/SectionHeader.tsx`, `SectionHeader.module.css`)
| Source | Theme |
|---|---|
| tsx:7-12 header div, Appear rise around h2, optional ArrowButton (tone dark) | `snippets/section-heading.liquid`; `<div data-appear="rise">` around `<h2>`; CTA via `render 'arrow-button'` only if cta_label and cta_href set; params title, cta_label, cta_href, tone, heading_tag, appear, class |
| css:1-9 `.header` flex wrap space-between flex-end width 100% max 1280 padding 0 32 | `.section-heading` |
| css:11-19 `.title` Clash 64/600/64/-.01em ink, white-space pre | `.section-heading__title` (+ `margin:0` to neutralise browser h2 margin; base.css reset may already do it) |
| css:21-26 810-1199.98 title 52/52 | same media query, same selector |
| css:28-34 <=809.98 column, align flex-start, gap 24, padding 0 20 | `.section-heading` in media query |
| css:36-39 <=809.98 title 38/38 | `.section-heading__title` |
| Title text with line breaks | `{{ title | escape }}` printed on one line, `white-space: pre` keeps `\n` |

## Appear (`components/Appear.tsx`)
| Source | Theme |
|---|---|
| presets rise {opacity 0,y 40; delay .1; 1.1s; ease [.22,1,.36,1]; amount .3} | `base.css` `.js [data-appear="rise"]` (Opus-owned, already present); amount in `appear.js` AMOUNTS.rise = .3 |
| lift {opacity 0,y 80,scale .98; 1.4s; amount .2} | `base.css` `.js [data-appear="lift"]`; AMOUNTS.lift = .2 |
| `amount` prop | `data-appear-amount` attribute (appear.js `amountOf`) |
| whileInView="shown", animate="hidden" (replays on leave) | IntersectionObserver per threshold; sets `data-shown` when `intersectionRatio >= amount`, removes it otherwise |
| (no reduced-motion in source) | `appear.js`: reduced motion -> `data-shown` on all, no observing; base.css also forces visible |
| elements rendered later | MutationObserver on added nodes + `shopify:section:load` |

## formatPrice (`lib/format.ts`)
| Source | Theme |
|---|---|
| `""` for non-number | `price.liquid`: blank/nil -> empty. `money.js`: non-number/NaN -> `''` |
| currency "Rs." | `settings.currency_prefix` / `Khuwabb.currencyPrefix` (read at call time) |
| `Intl.NumberFormat('en-US',{maximumFractionDigits:0})` | `money.js` same call on `cents / 100`; `price.liquid` integer math: `(cents + 50) / 100`, then grouping loop. Verified against Intl in a Node script for 0, 49, 50, 99, 100, 250000, 250050, 123456789, negatives |

## lib/catalog.ts and lib/img.ts
| Source | Theme |
|---|---|
| `photo(p, colour)` front photo of colour, else first photographed colour | `cutout-image.liquid` (colour front -> variant featured_media -> product.featured_media; blank colour = first Color value) |
| `Colour.views` front/side/back (+ piece-top/bottom per mapping) | `product-cutouts.liquid` (object or `as_list` array) |
| `responsive()` srcSet sorted by width, src = largest, width/height of largest | cutouts: srcset from widths list (default 360,480,640,960, skipping widths above the original), src = largest, width/height of src; image-tag: `widths`, `sizes`, `width`, `height` |
| `canOrder` / variants map `"<Colour> / <Size>"` | `product-json.liquid` `variants` map `{id, available}` (live `variant.available`); consumers must treat missing key as not orderable |
| product fields, `tint`, `soldAs`/category line | `product-json.liquid` `tint` (custom.tint), `categoryLine` (custom.category_line, else product.type) |
| options by name | `product.options_by_name['Color'/'Size']` |
| `colourList` / `productHref` | not provided (callers use `product.url`) |

## Not matched
- `atLeast()` from lib/img.ts: not needed, Shopify image_url produces any size.
- `Appear` `from`, `transition`, `as`, `style`, `className`, arbitrary data props: only the two presets exist (CSS-driven); custom poses need a new `data-appear` value in base.css.
- Appear threshold on elements taller than viewport/amount can never reach the ratio (same as framer).
- Appear "hidden" state while JS is off: shown (base.css gates on `.js`), intentional.
- `price.liquid` negative values round to "-0" like nothing special: Intl prints `-0` for -0.4 whole units, Liquid prints `0`.
- Non-Color/Size products: placeholder colour "Default" (and size key "Default"); source has no such case.
- Image attributes: `fetchpriority`/`class`/`sizes` passed as nil to `image_tag` when unset; relies on Shopify omitting nil attributes (verify in Stage B).
- Cut-out JSON/image output was not rendered (Stage A); only theme check and a Node check of the money algorithm were run.

## Decorative images (F1, intentional improvement)

`cutout-image.liquid` has a `decorative` param (default false). When true it renders `alt=""` and ignores `alt`/the generated alt; all other behaviour is unchanged. Callers: hanger-card, campaign-moods tiles, product-card (shop card: the name is visible text in the same link, so the source's alt = title was read twice; G15). No placeholder/replace workarounds remain in these files.

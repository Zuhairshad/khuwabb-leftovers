# Parity: cart (Bag drawer, cart API, cart page)

Source: `components/Bag.tsx`, `components/Bag.module.css`, `lib/bag.ts`, `lib/checkout.ts`, `lib/format.ts`.
Theme: `sections/cart-drawer.liquid` (D), `snippets/cart-line.liquid` (L), `sections/main-cart.liquid` (P), `assets/cart.js` (API), `assets/cart-drawer.js` (JS), `assets/section-cart-drawer.css` (CSS), `assets/section-main-cart.css` (PCSS), `assets/empty-bag.webp`.
Class map: `.layer/.scrim/.panel/.head/.title/.count/.close/.meter*/.track/.fill/.list/.empty*/.foot/.subtotal/.note/.checkout` -> `.cart-drawer__*` (kebab); `.line/.thumb/.lineBody/.lineTop/.size/.unavailable/.lineBottom/.stepper/.remove` -> `.cart-line__*`; `.num` -> `.cart-num`.

## 1. Bag.module.css (rules -> section-cart-drawer.css; each rule carries a `Bag.module.css:N-M` comment)
| Source | Theme |
|---|---|
| :1-34 `.button`, `.badge`, `.badge[data-bump]` | NOT here: `section-header.css` `.bag-button`, `.bag-button__badge` (header task). `data-bump` is set by cart-drawer.js `updateHeader` |
| :36-43 `.layer` fixed inset 0, z 9000, pointer-events none, font, ink | `.cart-drawer__layer` |
| :45-47 `.layer[data-open]` pointer-events auto | `.cart-drawer__layer[data-open]` |
| :49-59 `.scrim` rgba(23,20,15,.32), blur 0, opacity 0, .7s ease-out transitions | `.cart-drawer__scrim` |
| :61-65 open scrim opacity 1, blur 8px (+ -webkit-) | `.cart-drawer__layer[data-open] .cart-drawer__scrim` |
| :67-81 `.panel` 12/12/12, width min(460px, 100vw-24px), paper, r28, shadow, flex col, overflow hidden, translateX(calc(100% + 24px)), .9s | `.cart-drawer__panel` |
| :83-85 open panel translateX(0) | `.cart-drawer__layer[data-open] .cart-drawer__panel` |
| :87-92 `.head` | `.cart-drawer__head` |
| :94-98 `.title` 28/600/-.03em | `.cart-drawer__title` |
| :100-102 `.count` opacity .4 | `.cart-drawer__count` |
| :104-113 `.close` 44, r999, rgba(.06), grid | `.cart-drawer__close` (+ `padding:0`, reset of UA button padding that React's CSS-reset gave) |
| :115-139 `.meter/.meterLabel/.track/.fill` | `.cart-drawer__meter/-label/__track/__fill` (rendered only if `free_over > 0`) |
| :141-145 `.list` | `.cart-drawer__list` |
| :147-187 `.empty/.emptyArch(+img)/.emptyText/.emptyCta` | `.cart-drawer__empty/-arch/-text/-cta` |
| :189-198 `.line` base | `.cart-line` (shared, flex/gap16/padding 16 0) + `.cart-drawer__layer .cart-line` (opacity 0, translateY(14px), transitions `calc(.25s + var(--i)*.06s)`) - entrance scoped to the drawer so the page is not hidden |
| :200-202 `.line + .line` | `.cart-line + .cart-line` |
| :204-207 open line | `.cart-drawer__layer[data-open] .cart-line` |
| :209-224 `.thumb`, `.thumb img` | `.cart-line__thumb`, `.cart-line__thumb img` |
| :226-240 `.lineBody`, `.lineTop` | `.cart-line__body`, `.cart-line__top` |
| :242-244 `.num` | `.cart-num` |
| :246-250 `.size` | `.cart-line__size` |
| :252-256 `.lineBottom` | `.cart-line__bottom` |
| :258-273 `.stepper`, `.stepper span` | `.cart-line__stepper`, `.cart-line__stepper span` + `.cart-line__qty` (page `<input>` styled to look like the span) |
| :275-285 `.stepper button` | `.cart-line__stepper button` (+ `padding:0`) |
| :287-296 `.remove` | `.cart-line__remove` (+ `padding:0`; on the page it is an `<a>`) |
| :298-315 `.foot/.subtotal/.note` | `.cart-drawer__foot/-subtotal/-note` |
| :317-329 `.checkout` | `.cart-drawer__checkout` |
| :331-335 `.unavailable` #a8321e 13px mt4 | `.cart-line__unavailable` (shared rule also styles `.cart-line__error`, G21) |
| :337-340 `.checkout[aria-disabled]` opacity .4, not-allowed | `.cart-drawer__checkout[aria-disabled]` |
| :342-345 `.stepper button:disabled` | `.cart-line__stepper button:disabled` |
| no media queries in source | none in the drawer; page has one `max-width: 809.98px` padding rule (new page, see Not matched) |

## 2. Bag.tsx behaviour and strings
| Source | Theme |
|---|---|
| `FREE_OVER = 0`, meter only if > 0, no NaN | D `free_over` setting (whole rupees x100 -> cents); `{% if free_over_cents > 0 %}`, progress capped 0-100 via Liquid |
| `EMPTY_IMAGE` rendered via `atLeast(...,300)` (= `-320w.webp`) | `assets/empty-bag.webp` (320x400, the exact WebP variant the source serves), `loading=lazy`, `alt=""` |
| `<div data-code-component data-open data-bag-drawer>` | `<cart-drawer data-section="cart-drawer">`; layer `data-layer` + `data-open`; aside has `data-bag-drawer data-code-component` and its own `data-open` (toggled together in `setOpen`) |
| `<aside role="dialog" aria-label="Your bag">` | D `role="dialog" aria-modal="true" aria-label="{{ section.settings.title }}"` |
| Title `Your bag` + count (blank when 0) | D `title` setting, `data-drawer-count` |
| Close button aria `Close`, X svg (#17140F, 1.8, round) | D, `accessibility.close`, same path; `data-close data-close-button` |
| Meter copy `{price} away from free delivery` / `Free delivery unlocked` | locales `bag.free_delivery_away/unlocked`; amount bold via `price` snippet |
| Empty: `Your bag is empty.`, CTA `Start shopping` -> /shop, closes drawer | D `empty_text`, `empty_cta_label`, `empty_cta_link` (default /collections/all), CTA has `data-close` |
| Line: thumb img alt = name, name, `formatPrice(price*qty)` | L: `item.image | image_url: width 300`, alt, `item.product.title`, `price` of `final_line_price` |
| Line `{colour} · Size {size}` | L: `bag.colour_size` from `options_with_values` by name Color/Colour and Size; fallback variant title (not "Default Title") |
| `No longer available` for missing product | L: `bag.no_longer_available` when product title blank |
| `Not available to order` | L: `bag.not_available` when `!item.variant.available` |
| Stepper `−` `One less`, qty, `+` `One more` disabled if not orderable | L: same labels (`bag.one_less/one_more`), `disabled` when unavailable |
| `Remove` (changeQty -qty) | L `bag.remove`; JS `change(key, 0)`; page: `<a href=url_to_remove>` (works without JS) |
| `style={{--i: index}}` | L `style="--i: {{ index }}"` |
| Foot only when lines exist; Subtotal counts orderable lines only | D/P: Liquid loop summing `final_line_price` of available lines |
| Note `data-checkout-note`: ready / empty / unavailable / paused strings | D: `note` computed in the checkout-readiness block; ready = `note_ready` setting; others `bag.empty`, `bag.note_unavailable`, `bag.note_paused` |
| Checkout `<a data-checkout>` + arrow svg, href only when ready, `aria-disabled`, click prevented | D same markup; ready -> `href="{{ routes.root_url }}checkout"`; not ready -> no href + `aria-disabled="true"`; JS `handleClick` preventDefault |
| `Escape` closes | JS `handleKey` |
| Scroll lock: `documentElement.style.overflow='hidden'`, restore previous | JS `lock/unlock` (same, previous value restored; also on disconnect) |
| Open on `khuwabb-bag-open` (window event) | JS listens on `document` (header.js and cart.js dispatch on `document`) |
| Badge bump when count rises, 600ms; aria `Bag, N items` | JS `updateHeader`: `[data-bag-count]` text, `data-bump` on that badge element (the CSS selector is `.bag-button__badge[data-bump]`) for 600ms, `[data-bag-button]` aria-label from `Khuwabb.strings.bagButton` |

## 3. lib/bag.ts, lib/checkout.ts, lib/format.ts
| Source | Theme |
|---|---|
| localStorage `khuwabb-bag`, storage sync | Shopify cart (server). Cross-tab: `pageshow` (bfcache) refresh only |
| `addToBag(pieces, open)` | `Khuwabb.cart.add([{id, quantity}])` -> `/cart/add.js` with `sections=cart-drawer`, then `/cart.js`; fires `khuwabb-bag-change` then `khuwabb-bag-open` |
| `changeQty(id, delta)`; <=0 removes | `Khuwabb.cart.change(key, qty)` -> `/cart/change.js` (line `key`); JS computes qty from `data-quantity` |
| `clearBag`, `openBag`, `onBagOpen` | clear: `change(key,0)` per line (not needed in UI); open/on-open: `khuwabb-bag-open` event |
| `CHANGE` event | `khuwabb-bag-change` with `detail {cart, sections}` |
| `checkoutFor` order: empty, non-orderable, disabled, ready | D/P readiness block, same order. `ENABLED` -> `settings.checkout_enabled`. Permalink `/cart/<id>:<qty>` -> `/checkout` |
| `formatPrice` | `{% render 'price' %}` (server) / `Khuwabb.formatMoney` (not needed in my JS: HTML comes from the section) |

## 4. States
| State | Where |
|---|---|
| Closed | layer `inert`, `aria-hidden=true`, panel off-screen, no `data-open` (G15 fix) |
| Open, empty | D empty block; foot hidden; count blank |
| Open with lines | list + foot, stagger from `--i` |
| Sold-out line | L: `Not available to order`, `+` disabled; subtotal excludes it; checkout `aria-disabled` + `note_unavailable` |
| Checkout paused | `settings.checkout_enabled` false -> `note_paused`, disabled |
| Quantity change / remove | JS `changeLine` -> `cart.change`, `bag-change` swaps `[data-drawer-inner]`, focus returned to same line+action (else first Remove / close) |
| 422 error | `.cart-line__error[role=alert]` filled with `description || message` (#a8321e 13px) |
| Badge bump | see section 2 |
| Reduced motion | CSS media query: no scrim/panel/fill transitions, lines always visible, no stagger |
| Focus | focus to close button on open (rAF), Tab trap in panel, restore to opener on close |

## Not matched
- localStorage bag, `storage` events, catalog-derived price/name/image: replaced by the Shopify cart (A5).
- Build-time stock snapshot: replaced by live `variant.available` (G21). Quantity has no cap beyond Shopify's 422.
- `window` events: moved to `document` per contract; source dispatched on `window`.
- Checkout permalink `/cart/id:qty` -> `/checkout` of the live cart (drawer link); page uses a `name="checkout"` form button.
- Source's closed drawer being tabbable, no focus trap, no aria-modal: intentionally fixed (G15).
- `.line` entrance animation is not applied on the cart page (page has no drawer open transition).
- Cart page (`main-cart`) has no counterpart in the Next app (bag was drawer-only): page frame (max-width 720, padding 140/28, 112/20 under 810px) is new; lines/foot reuse drawer values.
- Page quantity changes reload the page (form submit) rather than AJAX; page 422 errors show Shopify's own cart redirect.
- Section-editor extras added (not in source): `shopify:section:select/deselect` opens/closes the drawer.

# Parity: product page

Sources: `components/product/ProductDetail.tsx`, `ProductDetail.module.css`, `app/products/[slug]/page.tsx`, `lib/catalog.ts`.
Files: `sections/main-product.liquid`, `assets/section-main-product.css`, `assets/product-form.js` (`<product-form>`).
CSS prefix `product__*`; root `<section class="product" data-section="product" data-product="{handle}">`. `<product-form>` is `display: contents`, so media and info are the grid items.

## ProductDetail.module.css

| Source | Theme (`section-main-product.css`) |
|---|---|
| `.page` :1-10 (grid 1.1fr/1fr, gap 56, max 1280, margin auto, padding 140/32/140, align start, font-features) | `.product` |
| `.media` :12-17 | `.product__media` |
| `.views` :19-23 | `.product__views` |
| `.views button` :25-36 (72x88, pad 8, r18, opacity .55, outline 2px transparent offset 2, transition opacity .2s) | `.product__views button` |
| `.views button[aria-pressed=true]` :38-41 | `.product__views button[aria-pressed='true']` |
| `.views img` :43-47 | `.product__views img` |
| `.gallery` :49-57 (4/5, radius 999 999 32 32, overflow hidden, flex centre) | `.product__gallery` (bg = inline tint) |
| `.gallery img` :59-64 (78%x84% contain, pdp-photo-in .6s ease-out) | `.product__gallery img`, animation `product-photo-in` |
| `@keyframes pdp-photo-in` :66-71 | `@keyframes product-photo-in` |
| `.info` :74-81 (sticky top 120, flex col, gap 22) | `.product__info` |
| `.category` :83-86 | `.product__category` |
| `.name` :88-96 | `.product__name` |
| `.price` :98-104 | `.product__price` |
| `.price s` :106-109 | not carried (G13: compare_at hidden) |
| `.group` :111-116 | `.product__group` |
| `.group legend` :118-123, `legend b` :125-129 | `.product__group legend`, `.product__group legend b` |
| `.options` :131-135 | `.product__options` |
| `.option` :137-148 | `.product__option` |
| `.option[aria-pressed=true]` :150-153 | `.product__option[aria-pressed='true']` |
| `.option[data-unavailable]` :155-159 | `.product__option[data-unavailable]` |
| `.add` :161-171 | `.product__add` |
| `.add:disabled` :173-176 | `.product__add:disabled, .product__add[data-inactive]` (data-inactive = server-rendered state before JS) |
| `.note` :178-183, `.note a` :185-187 | `.product__note`, `.product__note a` |
| `.facts` :189-196, `dt` :198-201, `dd` :203-207 | `.product__facts`, `dt`, `dd` |
| `@media (max-width: 809.98px)` :209-229 (`.page` 1 col/gap 28/padding 104 16 96; `.media` w100 max 480 centred; `.info` static; `.name` 32) | same query: `.product`, `.product__media`, `.product__info`, `.product__name` |
| (no tablet rule) | none, as source |
| reduced motion (source: none) | `@media (prefers-reduced-motion: reduce)`: `.product__gallery img` animation none, thumb transition none |
| (new) cart error 13px `#a8321e` (G21) | `.product__error` |
| (new) `?colour=` hold | `.product[data-pending] .product__media/.product__info { visibility: hidden }` |
| (new) no-JS button | `html.no-js .product__add[data-inactive]` looks enabled |

## ProductDetail.tsx behaviours

| Source | Theme |
|---|---|
| `colour` init = first colour (:14) | Liquid `mp_colour`: colour of `product.selected_variant` when `?variant=`, else first Color value; `<product-form data-colour>` |
| `size` init "" (:20) | `?variant=` also preselects the size (Liquid `mp_size`, `data-size`, `aria-pressed`, server button label/`data-inactive`; JS `logic.initialSize`). `?colour=` overriding the colour keeps the size only if that colour+size variant exists, else clears it. No `?variant=`: empty (source behaviour). A reload restores the state the page wrote with `replaceState`; the JS removes a stale `?variant=` when no full selection exists |
| `?colour=` exact, case-sensitive (:16-19) | inline script after the section (reads `URLSearchParams.get('colour')`, so `+` and `%20` both decode; sets `data-colour`, `data-pending`); `logic.colourFromSearch` is the same rule. product-form.js applies and clears `data-pending` (3 s failsafe) |
| `size` init "" , `view` init front, `added` false (:20-22) | `ProductForm.connectedCallback` |
| `shot`, `views` (front, side, back that exist), `src = views[view] ?? front` (:23-25) | `logic.viewsOf`, `logic.imageFor`; server: `cutout-image` snippet |
| `orderableHere`, `ready` (:26-27) | `logic.state`; server: `mp_orderable_here` loop |
| `facts` only non-blank (:28-33) | Liquid `<dl>`: Description = `product.description` (HTML), Fabric/Care = `custom.fabric/care` (escaped, newline_to_br), Size guide = `custom.size_guide | metafield_tag`; each only if non-blank |
| gallery bg = tint, img `key={src}` (animation restarts on src change), `responsive(src)`, `sizes`, `fetchPriority high`, alt `<name> in <colour>, <view> view` (:38-39) | `.product__gallery` inline `background` from `custom.tint`; JS replaces the `<img>` node when src changes; sizes `(max-width: 809px) 70vw, 440px`; fetchpriority high; alt built in Liquid and `altText()` |
| thumbs only if >1 view; `role=group aria-label=Photos`; buttons `aria-pressed`, `aria-label="<v> view"`, tint bg, img `atLeast(150)` alt "" (:41-49) | server thumbs (`cutout-image`, width 360, `decorative: true` -> alt "" (no THUMB placeholder/replace)), JS `renderThumbs` (smallest srcset entry); gated by `show_thumbs` setting |
| category line (set text / category) (:53) | `custom.category_line`, else `product.type` |
| h1, price (:54-58) | `<h1 class="product__name">`, `price` snippet; compare-at not rendered |
| Colour fieldset, legend `Colour <b>{colour}</b>`, pills with `aria-pressed`; click sets colour, `added=false`, keeps size and view (:60-80) | `fieldset.product__group`, `[data-option-colour]`; `onClick` |
| Size fieldset, "Sizes coming soon." note, pills, `data-unavailable` still clickable; click sets size, `added=false` (:82-102) | `[data-option-size]`; `toggleAttribute('data-unavailable')` |
| Add button `data-add-to-bag`, `disabled={!ready}`, 4-state label (:104-112) | `button.product__add[data-add-to-bag]`; `logic.state().labelKey` -> strings JSON |
| Add -> `addToBag` -> `added = result>0` (:109) | form submit -> `Khuwabb.cart.add([{id, quantity:1}])` (opens drawer) -> `added = true`; error shown in `[data-error]` |
| Restock note when `!orderableHere`, mailto link (:113-118) | `[data-restock]` toggled by `hidden`; text from `restock_note` setting (`{email}` -> mailto `settings.contact_email`), blank -> `product.restock_note_html` |
| `data-section="product" data-product` (:36) | root `<section>` |

## States

| State | Handled by |
|---|---|
| default | server render + `render()` |
| colour switched (keeps size/view; "added" reset) | `onClick`; stale view kept, image falls back to front |
| view switched | thumb click; image replaced, animation restarts |
| size chosen / full selection | enables Add; URL `?variant=<id>` via `history.replaceState`, hidden `id` input updated |
| sold-out size | pill struck (still clickable), label "Sold out in this size", disabled |
| sold-out colour | label "Sold out in this colour", disabled, restock note |
| sold-out product (gym set) | every colour sold out: disabled "Sold out in this colour" |
| added | label "Added — add another" until colour/size changes |
| add error | `.product__error` (`err.message` from cart.js, e.g. 422) |
| no sizes | "Sizes coming soon." note, label "Sold out in this colour" (as source) |
| single view | thumbs row removed |
| phone | media query above |
| reduced motion | animation off |
| no JS | real `<form action="/cart/add">` with hidden `id` = `selected_or_first_available_variant`; button label via `.product__add-label--nojs` ("Add to bag", or `product.sold_out` plus `disabled` when `product.available` is false); the JS state label span is hidden under `html.no-js`; `product-form.js` removes the no-JS span on init; pills inert |

## Strings

All from `locales/en.default.json`: `product.colour|size|sizes_coming_soon|choose_size|add_to_bag|added|sold_out_colour|sold_out_size|restock_note_html|description|fabric|care|size_guide`, `accessibility.photos|view`. Restock note default text lives in the section setting `restock_note`.

## Added (not in source)
Product JSON-LD (G19) in the section; `?variant=` write-back; hidden `id` form field; colour fieldset hidden if the product has no Color option.

## Not matched
- `.price s` / compare-at: G13.
- `?colour=` is applied by product-form.js after the inline script holds the first paint (`visibility: hidden`), not by rendering the DOM inline (avoids duplicating render code); worst case 3 s hidden if the script fails.
- Image/thumb widths are 360-960 from `product-json`; the source used its own `responsive()` widths.
- Description is HTML (Shopify body), source was plain text; `dd` first/last child margins zeroed.
- Add button is `type="submit"` in a form (source `type="button"`); `data-add-to-bag` hook kept.

## Stage B checks
- `?colour=<multi-word>` link (e.g. `?colour=White+with+red+stripes`): no flash of the default colour; accepted behaviour is that media + info stay `visibility: hidden` until product-form.js renders (3 s failsafe). Verify the hold is short and layout does not jump.
- `?variant=<id>` reload restores colour, size, pressed pill and button label; `?colour=X&variant=Y` keeps the size only if X+size exists.
- No-JS (`html.no-js`): button shows "Add to bag" (or "Sold out", disabled, for a fully sold-out product); with JS only the state label is visible and `button.textContent` has no second label.

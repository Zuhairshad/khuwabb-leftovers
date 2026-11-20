# Parity: collections (Shop, New In)

Files: `sections/collection-intro.liquid`, `sections/main-collection-grid.liquid`, `snippets/product-card.liquid`, `sections/new-in-header.liquid`, `sections/main-collection-hangers.liquid`, `assets/section-collection-intro.css`, `assets/section-main-collection-grid.css`, `assets/section-new-in.css`, `assets/collections-{640,960,1280,1849}w.webp`, `assets/new-in-header-{400,819}w.webp`.
Breakpoints as source: tablet `min-width:810px and max-width:1199.98px`, phone `max-width:809.98px`.

## CSS rules
| Source | Theme |
|---|---|
| app/shop/page.module.css:1-8 `.products` | section-main-collection-grid.css `.collection-grid` |
| page.module.css:10-14 phone padding | same file, phone `.collection-grid` |
| ShopIntro.module.css:1-9 `.intro` | section-collection-intro.css `.collection-intro` |
| :11-18 `.freezer` | `.collection-intro__photo` |
| :20-27 `.freezer img` | `.collection-intro__photo img` |
| :29-37 `.heading` | `.collection-intro__heading` |
| :39-42 `.titleWrap` | `.collection-intro__title-wrap` |
| :44-53 `.title` | `.collection-intro__title` (+ `margin:0`) |
| :55-64 `.note` | `.collection-intro__note` (+ `margin:0`) |
| :66-78 tablet (freezer 440, title 84, note 19) | tablet block, same selectors |
| :80-113 phone | phone block, same selectors |
| ProductGrid.module.css:1-9 `.grid` | section-main-collection-grid.css `.collection-grid__grid` |
| :11-19 `.product` | `.product-card` (+ colour/text-decoration reset for `<a>`) |
| :21-30 `.card` | `.product-card__card` |
| :32-35 `.cutout` | `.product-card__cutout` (+ hover transition) |
| :37-46 `.cutout img` | `.product-card__cutout img` |
| :48-53 `.info` | `.product-card__info` |
| :55-63 `.name,.price` | `.product-card__name, .product-card__price` (+ margin:0) |
| :65-69 `.name` ; :71-73 `.price` | `.product-card__name`; `.product-card__price` |
| :75-84 tablet (3 cols minmax 200, card 320) | tablet block |
| :86-112 phone (2 cols, gap 28/12, card 220 pad 36/12/12, info column gap 2 pad 12/4/0, name flex none) | phone block |
| NewInPage.module.css:1-9 `.page` | section-new-in.css `.new-in` + `.new-in--header` (top padding) + `.new-in--grid` (72px gap as top padding, bottom 160). Split because header and grid are separate sections; `overflow: clip` on both |
| :11-16 `.header` | `.new-in__header` |
| :18-26 `.photo`; :28-35 `.photo img` | `.new-in__photo`; `.new-in__photo img` |
| :37-44 `.title` | `.new-in__title` |
| :46-55 `.title h1` ; :57-65 `.title p` | `.new-in__h1` ; `.new-in__text` |
| :67-75 `.grid` | `.new-in__grid` |
| :77-85 `.hanger`, :87-90 svg, :92-102 `.card`, :104-109 `.card img`, :111-136 info/name/price | existing `component-hanger-card.css` (context grid), loaded by main-collection-hangers |
| :138-155 tablet | tablet block (photo 300x400, h1 84, p 19, 3 cols) |
| :157-205 phone (+ info column block) | phone block (page padding 100/16 -> header top / grid bottom 96, gap 44 -> grid top, header column gap 28, photo 100x380, h1 54, p 17, grid 2 cols gap 40/12); info column rules are in hanger-card CSS |

## Behaviour
| Source | Theme |
|---|---|
| ShopIntro entrances: photo opacity .001/scale .92, delay .1, 1.4s; title y40 delay .5 1.2s; note y24 delay .7 1.2s, ease [.22,1,.36,1] | CSS keyframes `collection-intro-photo/title/note` with `var(--ease-out)`, `animation-fill-mode: both`, on load. Source runs on mount under the overlay (no wait for intro end); theme does the same, no `data-intro-playing` gating |
| NewInPage entrances: photo opacity .001, scale .9, y40, .1/1.4s; h1 y40 .5/1.2s; p y24 .7/1.2s | keyframes `new-in-photo/h1/text` |
| Card reveal: hidden {opacity 0, y 60}, 1.1s ease-out, whileInView amount .15, replays | `data-appear="card" data-appear-amount="0.15"` (appear.js toggles `data-shown`); CSS in section-main-collection-grid.css `.js .product-card[data-appear]:not([data-shown])`, duration 1.1s, no delay |
| Cut-out hover spring rotate -3, scale 1.08, y -6, bounce .45 .9s | `.product-card__cutout` transition `transform .9s var(--spring-cutout)`, `:hover` inside `@media (hover:hover)` |
| Hanger hover rotate 5 | component-hanger-card.css (unchanged) |
| First 4 cards eager | `eager_count` setting (4); `loading` param of product-card |
| `atLeast(src,360)` cut-out | cutout-image widths `360,480,640`, sizes `(max-width: 809.98px) 45vw, 290px` (hangers: `... 45vw, 280px`) |
| Card alt = name | `alt: product.title` passed to cutout-image; hanger-card keeps alt="" (decorative) |
| intro image `responsive("/brand/collections.jpg")` | image_picker -> collection.image -> asset srcset 640/960/1280/1849, sizes `(max-width: 1279px) calc(100vw - 32px), 1216px`, fetchpriority high |
| new-in photo `responsive(...)`, alt "", sizes `(max-width: 809px) calc(100vw - 32px), 360px` | image_picker -> asset 400/819w; `image_alt` blank = alt="" |
| `<title>` strings | head-meta (shared) |

## States
- Load with intro: entrances run under the overlay exactly like the source (finished before the overlay leaves).
- Load without intro (product-style skip / intro off): entrances play on load.
- Hover (desktop): cut-out spring. Touch: none.
- Tablet / phone: blocks above. Reduced motion: no entrances, no card rise (always visible), no cut-out spring.
- Empty collection: `empty_text` setting message (default "Nothing here yet. New pieces land every week.").
- Page 2: `{% paginate %}` with Previous / numbered / Next pills (strings from `general.pagination.*`, already in en.default.json). Cards re-reveal per page load.

## Strings
| String | Where |
|---|---|
| All collections | collection-intro title fallback for handle `all` (blank setting) |
| Note, alt | collection-intro `note`, `image_alt` defaults |
| New arrivals | collection title (template/collection) or new-in-header `title` |
| New-in text | new-in-header `text` |
| Empty message | `empty_text` (both grid sections) |
| Pagination | locale `general.pagination.*` |

## Not matched
- Pagination, empty message, card focus-visible outline: theme additions (no reference design).
- Source `whileHover` on `.cutout` only; theme also only on `.product-card__cutout:hover` (no keyboard-focus spring on shop cards, as source).
- framer spring approximated by `--spring-cutout` linear(); card reveal uses ease-out as source.
- `.js` class required for the card hidden state (no-JS shows all cards).
- Shop page title/heading for non-`all` collections reuses the Shop design with the collection title.

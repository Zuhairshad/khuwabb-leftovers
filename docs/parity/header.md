# Parity: header (Nav + BagButton)

Files: `theme/sections/header.liquid` (H), `theme/snippets/header-icon.liquid` (I), `theme/assets/section-header.css` (C), `theme/assets/header.js` (J).
Source: `components/Nav.tsx`, `components/Nav.module.css`, `components/Bag.tsx` (BagButton), `components/Bag.module.css:1-34`, `lib/intro.ts`.

## CSS rules

| Source | Theme |
|---|---|
| Nav.module.css:1-11 `.nav` fixed, top 16, z 50, flex center, padding 0 16 | C `.site-header` |
| :13-26 `.pill` width `min(100vw - 32px, 1240px)`, padding 8 8 8 24, `overflow: clip`, bg rgba(255,255,255,.6), radius 32, 2-layer shadow, blur(18px) + -webkit- | C `.site-header__pill` |
| :28-33 `.bar` 64px | C `.site-header__bar` |
| :36-41 `.logo` | C `.site-header__logo` |
| :43-47 `.logo img` auto x 54px | C `.site-header__logo img` |
| :49-58 `.logo span` 10px/10px, ls .34em, lowercase, ink-62, mt -1 | C `.site-header__logo span` |
| :60-64 `.links` gap 32 | C `.site-header__links` |
| :66-72 `.links a` 16px/16px 500 ink-62 | C `.site-header__links a` |
| :74-78 `.actions` gap 8 | C `.site-header__actions` |
| :80-89 `.search` 44px circle, bg ink 6%, #000 | C `.site-header__search` |
| :91-101 `.menu` hidden, 44px, relative, circle, bg ink 6% | C `.site-header__menu` |
| :103-110 `.line` abs, left 13, 18x2, radius 2, ink | C `.site-header__line` (+ `--top` top 17, `--bottom` top 25) |
| :112-114 `.drawer` overflow hidden | C `.site-header__drawer` (grid 0fr/1fr, overflow hidden) + `__drawer-clip` |
| :116-121 `.drawerInner` col, gap 6, padding 28 0 20 | C `.site-header__drawer-inner` |
| :123-130 `.drawerInner a` display 40/46, 600, ls -.6px, ink-62 | C `.site-header__drawer-inner a` |
| :132-145 `@media (max-width: 809.98px)` pill padding 6 6 6 20; hide links + search; show menu (`display:block`) | C same media query, same selectors |
| :147-151 `@media (min-width: 810px)` drawer hidden | C same media query |
| Bag.module.css:1-15 `.button` | C `.bag-button` |
| :17-30 `.badge` (min 32, h 32, pistachio, grid center, 13px tabular, transform .6s cubic-bezier(.34,1.8,.64,1)) | C `.bag-button__badge` |
| :32-34 `.badge[data-bump]` scale(1.25) | C `.bag-button__badge[data-bump]` (attribute set by cart-drawer.js) |

## Behaviour and states

| Source | Theme |
|---|---|
| Nav.tsx:28-30 entrance opacity .001->1, y -30->0, 1s ease [.22,1,.36,1], delay 3.3 | C `html[data-intro-playing] .site-header { animation: site-header-in 1s var(--ease-out) var(--site-header-delay) backwards }`; delay from H setting `entrance_delay` (inline `--site-header-delay`). Pure CSS, correct before JS. |
| `instant` (`skipsIntro`, `/products/*`) = no animation | No `data-intro-playing` on product pages (head-config.liquid) so the rule never applies; header just renders in place. Same when the intro is disabled / editor. |
| Nav.tsx:32 pill `data-open`, layout spring bounce .1 / .6s | J toggles `data-open` on `[data-pill]`; C grows the drawer row `grid-template-rows` 0fr->1fr `.6s var(--spring-nav)`, pill height follows |
| :61-62 hamburger top 17/25 -> 21, rotate +-45, spring | C `.site-header__pill[data-open] .site-header__line--*` with `top`/`transform` `.6s var(--spring-nav)` |
| :53-60 menu button aria-label Open/Close, aria-expanded, `data-menu-toggle` | H markup (labels from locales `accessibility.open_menu/close_menu`, also as `data-label-*` on `<site-header>`); J updates both |
| :66-85 drawer mounts only when open | H always rendered; closed = `inert` (markup + J), `visibility:hidden` (C, delayed .6s on close so the close animation shows) |
| Landmarks "Main" / "Mobile" | H `accessibility.main_navigation` / `mobile_navigation` |
| Bag click opens bag (Bag.tsx:53) | J dispatches `khuwabb-bag-open` |
| Bag count / aria-label / bump | H renders `cart.item_count` + `bag.button_label`; updates by cart-drawer.js (batch 1) |
| Theme additions (G15) | J: Escape closes + focus to toggle; link click in drawer closes; crossing to >=810px closes; closed drawer inert. |
| prefers-reduced-motion | C: entrance animation none; line/drawer/badge transitions none (instant) |
| Hover / focus | Source has none for header (links, search, menu, bag). Focus ring from base.css `:focus-visible`. |

## Text and attributes

| String | Where |
|---|---|
| Logo `aria-label` "Khuwabb leftover — home" | H setting `logo_aria` |
| Logo text "leftover" | H setting `logo_label` |
| Logo img `/brand/logo.png` 365x256, alt "" | H: `settings.logo` image_picker, fallback `assets/logo.png` 365x256, alt "" |
| Links Shop / New in / Lookbook -> /shop, /new-in, /#looks | H `menu` link_list (`main-menu`); empty-menu fallback hardcoded in H: `/collections/all`, `/collections/new-in`, `/#looks`; rendered in desktop nav and drawer from one captured block |
| Search link `/search`, aria-label "Search", SVG | H (`routes.search_url`, `accessibility.search`), I (exact SVG), `show_search` toggle |
| Bag "Bag", aria-label "Bag, N items" | H, locales `bag.button`, `bag.button_label`; markup per mapping 1.1 + `data-code-component` kept from source |
| "Open menu"/"Close menu", "Main", "Mobile" | locales `accessibility.*` |
| `data-section="nav"`, `data-menu-toggle`, `data-bag-button`, `data-bag-count` | H |

## Not matched
- framer `layout` spring on the pill and `height 0<->auto` on the drawer: approximated with `--spring-nav` (linear()) on a grid row transition. Overshoot (<0.2%) is imperceptible; the pill's height is animated indirectly, not by FLIP.
- Source unmounts the drawer when closed; theme keeps it in DOM (inert + visibility hidden). No visual difference.
- Entrance wrapper is the inner `.site-header` (the `data-section="nav"` root) rather than a separate `__wrap` element.
- Bag button is a `<button>` that does nothing without JS (no fallback link to /cart); the source has the same limitation. Decision: keep per mapping 1.1.
- Fallback menu labels (Shop / New in / Lookbook) are hardcoded English, not locale keys (none exist in en.default.json).

## QA Q3 additions (A2, A15)

| Source / requirement | Theme location |
|---|---|
| Banner landmark (QA A2) | `sections/header.liquid`: the `data-section="nav"` element is now `<header class="site-header">` (was `div`); same class and data hook, CSS unchanged. |
| Bag button popup semantics (QA A15) | `sections/header.liquid` `.bag-button`: `aria-haspopup="dialog"`. `aria-controls` NOT added: the drawer panel in `sections/cart-drawer.liquid` (`role="dialog"`) has no id. |

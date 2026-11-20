# Audit: Khuwabb Next.js storefront (reference for the Shopify theme)

Phase 1 output. Merged from four read-only slice audits (A: shell + tokens,
B: hero/reels/new-in ticker/campaign widget, C: other home sections,
D: shop/product/bag/catalog/Shopify sync). Every value was read from the
source; file:line references are to this repo. Nothing here is a mapping
decision — that is `docs/mapping.md`.

---

## 1. Design tokens (exact values)

### 1.1 CSS custom properties — `app/globals.css:1-18`
| Var | Value |
|---|---|
| `--paper` | `#f7f3ec` |
| `--ink` | `#17140f` |
| `--ink-62` | `rgba(23, 20, 15, 0.62)` |
| `--ink-soft` | `#17140f9e` |
| `--ink-line` | `#17140f1f` |
| `--white` | `#fff` |
| `--pistachio` | `#d5e5be` (= rgb(213,229,190)) |
| `--strawberry` | `#f6c9cf` (= rgb(246,201,207)) |
| `--lemon` | `#f5e7a6` (= rgb(245,231,166)) |
| `--blueberry` | `#c9d2f2` (= rgb(201,210,242)) |
| `--peach` | `#f7d2b8` (= rgb(247,210,184)) |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--font-display` | `var(--font-clash-display), sans-serif` |
| `--font-body` | `var(--font-satoshi), sans-serif` |
| `--text-features` | `"blwf" on, "cv03" on, "cv04" on, "cv09" on, "cv11" on` |

The five pastels recur everywhere as data colours (reel flavours, mood tags,
look tints, category cards, intro arches, curtain) in `rgb()` form.

### 1.2 Global base rules — `app/globals.css`
- `* { box-sizing: border-box }`; `html, body { margin:0; padding:0 }`.
- body: bg `--paper`, colour `--ink`, font `--font-body`, antialiased (both prefixes).
- `a { color: inherit; text-decoration: none }`; `h1–h4, p { margin:0; font-weight: inherit }`; `button { font: inherit }`; `img { display:block; max-width:100% }`.
- `[data-section] { font-feature-settings: var(--text-features) }`; `[data-code-component] { font-feature-settings: normal }` (newsletter form opts out).
- No global line-height / letter-spacing / root font-size: every component sets its own.
- Reduced-motion block (`:137-145`) for the intro only (see §5.2).

### 1.3 Fonts — `app/fonts.ts` (next/font/local, `display: swap`, fallback `sans-serif`, Next's auto metric-matched fallback)
| Family | Files | Weights loaded | CSS var |
|---|---|---|---|
| Clash Display | `public/fonts/clash-display-600.woff2`, `-700.woff2` | 600, 700 | `--font-clash-display` |
| Satoshi | `public/fonts/satoshi-400.woff2`, `-500.woff2` | 400, 500 | `--font-satoshi` |

- Satoshi 600 is requested in several places (newsletter button, reels buttons, tags, prices) but not loaded → renders as 500 synthetic/nearest. Port must reproduce what the browser actually renders (500 face), verified by compare.
- Clash 700 used only by the receipts brand mark (`Receipts.module.css:57-63`).
- `<html lang="en">`, viewport `width=device-width, initial-scale=1`.

### 1.4 Breakpoints
| Name | Query | Used by |
|---|---|---|
| Phone | `max-width: 809.98px` | Nav, Footer, all home sections, `lib/useMedia.ts` `PHONE` |
| Tablet | `810px – 1199.98px` | Footer, SectionHeader, Flavours, FreshDaily, Looks, Receipts |
| Below desktop | `max-width: 1199.98px` | Flavours (stacked cards), `BELOW_DESKTOP` |
| Desktop nav | `min-width: 810px` | Nav |
| Reels phone | `max-width: 639.98px` (CSS) and element width `< 640` (JS) | ScoopReels |
| Curtain mobile edge | element width `< 640` (JS) | FittingCurtain |
| Campaign narrow | frame width `< 700` (JS) | GelatoCounter |

Content width: `max-width 1280px` + `padding 0 32px` (phone `0 20px`) for sections; Receipts row `1216px`; footer bottom `1216px`.

### 1.5 Easing / motion constants
- Main ease: `--ease-out` = `cubic-bezier(.22,1,.36,1)`.
- `cubic-bezier(.65,0,.35,1)`: curtain, intro bg fade, newsletter done clip-path.
- `cubic-bezier(.76,0,.24,1)`: intro letter exit. `cubic-bezier(.35,.05,.2,1)`: intro reel spin.
- framer springs (to approximate in CSS): Nav `{bounce .1, duration .6}`; ArrowButton `{bounce .2, .5}`; Flavours `{bounce .15, .9}`; NewIn hanger hover `{bounce .55, 1.1}`; Receipts entrance `{bounce .25, 1.4}`; CareLabels entrance `{bounce .3, 1.2}`, hover `{bounce .4, .6}`.
- Appear presets: `rise` = from `{opacity 0, y 40}`, delay .1, 1.1s, ease-out, amount .3; `lift` = from `{opacity 0, y 80, scale .98}`, 1.4s, amount .2. Both replay when leaving the viewport.

### 1.6 Shared component tokens
- **Nav pill**: bg `rgba(255,255,255,.6)`, radius 32, shadow `0 1px 2px rgba(23,20,15,.06), 0 10px 30px rgba(23,20,15,.06)`, `backdrop-filter: blur(18px)`; fixed top 16, padding `0 16px`; pill width `min(100vw - 32px, 1240px)`, padding `8px 8px 8px 24px` (phone `6px 6px 6px 20px`); bar height 64; logo img height 54; links gap 32, 16px/500/lh16 `--ink-62`; search + menu buttons 44×44 bg `rgba(23,20,15,.06)`; z-index 50. Logo sub-label "leftover": 10px/500/lh10/ls .34em lowercase `--ink-62`, margin-top -1. Drawer links: display 40px/600/lh46/ls -.6px `--ink-62`, gap 6, padding `28px 0 20px`.
- **ArrowButton** (`components/ArrowButton.module.css`): height 52, padding `0 8px 0 24px`, gap 10, radius 999; label 16px/500/lh 20.8/ls -.08; badge 38×38 with 18px arrow (line `M6 18L13.125 10.875`, triangle `M8.25 6H18V15.75Z`, stroke 1.5). Dark tone: bg ink / text paper / badge paper / arrow #000. Light tone: bg white / text ink / badge ink / arrow #000 (near-invisible: bug in original). Hover: badge rotates 0→45° spring.
- **SectionHeader** (`components/home/SectionHeader.module.css`): flex row wrap, space-between, align flex-end, max-width 1280, padding `0 32px`; title display 64/64/600/ls -.01em, `white-space: pre`; tablet 52/52; phone column, gap 24, padding `0 20px`, title 38/38. Title wrapped in Appear `rise`.
- **Section titles** elsewhere (Looks name, Receipts title) use the same 64/52/38 scale. Body large copy: 20px/1.45/ls -.01em (tablet 19, phone 17).

(Component-specific tokens are listed with each component in §3.)

---

## 2. Routes

| Route | Source | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Home: Hero, Flavours, NewIn, FreshDaily, Looks (`#looks`), Receipts, CareLabels |
| `/shop` | `app/shop/page.tsx` | All products |
| `/new-in` | `app/new-in/page.tsx` | New-in hanger grid |
| `/products/[slug]` | `app/products/[slug]/page.tsx` | Static per product; skips the intro |
| `/search` | — | Linked from the nav; **no route exists** (404 in Next). Shopify's `/search` will serve it. |
| `/#looks` | anchor | Nav + footer "Lookbook" |

Global metadata (`app/layout.tsx:11-12`): title `Khuwabb — Women's pret & couture`; description `Clothes that feel like a dream you never want to wake up from. Born in Lahore.`

### 2.1 Per-route details
| Route | Title | Generation |
|---|---|---|
| `/shop` | `All collections · Khuwabb` | static |
| `/new-in` | `New arrivals · Khuwabb` | static |
| `/products/[slug]` | `${Shopify title} · Khuwabb` (fallback `Khuwabb`) | `generateStaticParams` over 13 products, `dynamicParams = false` → unknown slug 404 |

- No meta description per page, no OG tags, no JSON-LD anywhere.
- No `/collections/*` route and no category filtering anywhere: "category" is only a data field.
- Build runs `scripts/sync-shopify.mjs` first, so prices/stock are build-time snapshots.
- Two products have a site slug ≠ Shopify handle (`lib/shopify-config.mjs:13-16`): `boat-neck-long-sleeve-maxi-dress` → `womens-boat-neck-long-sleeve-maxi-dress`; `ladies-vinyl-jacket` → `womens-high-shine-vinyl-puffer-jacket`. Shopify URLs will change for these two (redirects needed if the old URLs matter).

---

## 3. Components

### 3.0 Shell (`app/layout.tsx`)
`<html>` with font vars → MotionProvider → Nav, `<main>`, Footer; ScoopIntro rendered after (outside MotionProvider). Intro runs on every route except `/products/*`.

| Component | Purpose | Interactive | Data source | Port notes |
|---|---|---|---|---|
| `components/Nav.tsx` | Fixed glass pill header + phone drawer | y | hardcoded LINKS; BagButton from Bag.tsx | Menu → Shopify menu setting |
| `components/Footer.tsx` | Newsletter hero, link columns, socials, legal, curtain | y (hover) | hardcoded; `data/fitting-curtain.json` | settings + menus |
| `components/NewsletterForm.tsx` | Pill email form | y | hardcoded copy (`data/newsletter-form.json` is NOT used) | Currently a `mailto:` |
| `components/ScoopIntro.tsx` | Slot-machine "khuwabb" intro overlay | n | `data/scoop-intro.json` | vanilla JS + CSS |
| `components/FittingCurtain.tsx` | Curtains opening over the footer | n | props from `data/fitting-curtain.json` | vanilla JS |
| `components/ArrowButton.tsx` | Pill link + rotating arrow badge | hover | props `href, label, tone` | snippet |
| `components/Appear.tsx` | Scroll reveal wrapper (rise/lift, replays) | n | presets | IntersectionObserver + CSS |
| `components/MotionProvider.tsx`, `motionFeatures.ts` | framer LazyMotion domMax | — | — | not needed |
| `lib/useMedia.ts`, `lib/intro.ts`, `lib/img.ts` | media hook; `skipsIntro(path)` = starts with `/products/`; srcset helpers over `data/image-sizes.json` | — | — | CSS media queries / `template.name` / `image_url` |

**Nav text**: links `Shop`→`/shop`, `New in`→`/new-in`, `Lookbook`→`/#looks` (desktop + drawer). Logo link `/`, aria-label `Khuwabb leftover — home`, img `/brand/logo.png` (365×256, alt ""), visible text `leftover`. Search link `/search`, aria-label `Search`, inline magnifier SVG (circle cx10.5 cy10.5 r7.5, path `M15.803 15.803L21 21`, stroke 1.5, colour #000). Menu button aria-label `Open menu`/`Close menu`, `aria-expanded`, `data-menu-toggle`. Landmarks `aria-label="Main"` and `"Mobile"`.
Layout: ≥810 logo left, links centred, search + bag right; menu and drawer hidden. ≤809.98 links + search hidden, menu button shown, drawer expands inside the pill; bag stays.

**Footer** (`Footer.module.css`): bg ink, colour paper; desktop padding `220px 96px 32px`, gap 160, min-height 900; tablet gap 120, padding `200px 72px 32px`; phone gap 96, min-height 760, padding `140px 36px 28px`.
- Title **`<h1>`** `Dressed in dreams`: display 120/600/lh .95/ls -.01em, centre, balance (tablet 84, phone 54).
- Lede `Clothes that feel like a dream you never want to wake up from. New drops every week — hear about them first.` 20px/1.45/ls -.01em, `rgba(247,243,236,.7)`, max-width 520 (tablet 19, phone 17).
- `.newsletter` gap 28, max-width 900; form max-width 520. `.bottom` gap 40, max-width 1216; divider `1px solid #f7f3ec24`. `.columns` gap 48 (phone 32), padding-top 40, wrap; `.column` `flex:1 0 0; min-width:160px; gap:12px`.
- Column headings 16/500/lh 20.8/ls -.08; links 16/400/lh 24 `rgba(247,243,236,.7)`.
  - **Shop**: `All collections`→/shop, `New in`→/new-in, `Lookbook`→/#looks
  - **Help**: `Size guide`→`mailto:khuwabb@gmail.com?subject=Size%20guide`, `7-day exchange`→`mailto:…?subject=Exchange`, `khuwabb@gmail.com`→mailto
  - **Khuwabb**: `Born in Lahore`→/, `Delivery across Pakistan`→/shop, `Cash on delivery`→/shop
- Socials (48px circles, bg `rgba(247,243,236,.08)`, hover `.18` 0.3s; 20px icon as CSS mask in paper): Instagram/Tiktok/Pinterest → root domains `https://instagram.com` etc. (placeholders), icons `public/icons/{instagram,tiktok,pinterest}.svg`.
- Legal `© 2026 Khuwabb. Born in Lahore.` 14/500/lh 19.6 `rgba(247,243,236,.5)` (year hardcoded; phone stacks with gap 16).
- Payment icons (`apple-pay, klarna, paypal, stripe` SVGs + `.payments` CSS) exist but are **not rendered**.

**NewsletterForm**: form padding `6px 6px 6px 22px`, gap 8, radius 999, bg `rgba(247,243,236,.08)`, border `1px rgba(247,243,236,.16)` (error `#f3a0a0`); input/button height 50, input 16px, placeholder `rgba(247,243,236,.5)`; button padding `0 24px`, 15px/600, bg pistachio, text ink, hover scale 1.04 .5s ease-out; error 13px `#f3a0a0`, reserved height 22, padding `8px 0 0 22px`. Copy: placeholder/aria `Your email`, button `Subscribe`, success `You’re in. See you in your inbox.`, error `That email doesn’t look right`. Regex `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`.

### 3.1 Home — order (`app/page.tsx:12-18`)
1. Hero (outfit reels) 2. Flavours "Find your fit" 3. NewIn "New arrivals" 4. FreshDaily "Wear the dream" 5. Looks "Shop the look" (`id="looks"`) 6. Receipts "Seen on you" 7. CareLabels.

### 3.2 Hero + ScoopReels — `components/home/Hero.tsx`, `components/ScoopReels.tsx` (715 lines)
- Hero: `section[data-section=hero]`, `height:100vh; min-height:720px`, bg pistachio, overflow clip.
- Config `data/reels.json`; only `flavours, autoShuffle(0), intro(true), introDelay(2.9), curve(1), lookScale(1), sideBlur(2.4), spacing(1), topInset(.11), topSpace(112), topSpaceMobile(92)` are read. Label strings in the JSON are ignored; labels are hardcoded in TSX.
- Flavours (backdrop colour + giant word): Campus rgb(213,229,190), Weekend rgb(246,201,207), Brunch rgb(245,231,166), Work rgb(201,210,242), Winter rgb(247,210,184).
- **Rows**: tops = every `category === "Jackets"` product's per-colour front cut-out, round-robin across products, plus the gym top (`/products/gym-co-ords-set/black/piece-top.webp`); bottoms = every `"Trousers"` colour cut-out + gym bottom (`piece-bottom.webp`); both gym pieces share id `gym-co-ords-set#Black`. Rows are cycled to ≥12 slots. Shoes row empty. **No explicit outfit pairing**: any jacket can sit over any trouser.
- **Text**: `Shuffle` (button + aria), `Drag any row to restyle` (hint, hidden on phone), `The look` (total label), CTA `Add the look` (or `Shop all`→/shop when nothing centred). Chooser: dialog `Add the look`, close `×` aria `Close`, selects aria `<name> colour` / `<name> size`, placeholder `Size`, button `Add to bag` / `Sold out`. Backdrop words (aria-hidden): Campus, Weekend, Brunch, Work, Winter.
- **Tokens** (`ScoopReels.module.css`): root bg transition `background-color 1.4s var(--ease-out)`, `touch-action: pan-y`. Glow: centre 50%/52%, width 70% (phone 120%), `radial-gradient(closest-side, rgba(255,255,255,.75), rgba(255,255,255,0) 72%)`. Word: top 46% (phone 40%), display 600, `min(19vw,30vh)` (phone 27vw), ls -.05em, colour = flavour darkened 4.5%; inactive opacity 0, blur 14, scale 1.06 → active opacity 1/blur 0/scale 1 (opacity/filter 1.1s ease, transform 1.4s ease-out). Piece img drop-shadow `0 18px 22px rgba(40,30,20,.16)`. Name tag: padding `9px 14px` (phone `7px 11px`), radius 999, bg `rgba(255,255,255,.62)`, blur 14, shadow `0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(40,30,20,.08)`, 14px (phone 12); show transition opacity .7s/transform .9s/filter .7s with .15s delay. Bar: left/right 32 (phone 16), bottom 28 (phone 18), z 500. Shuffle: h52 (phone 46), padding `0 22px 0 6px`, bg ink, colour #fbf8f2, 15px/600, shadow `0 10px 30px rgba(20,16,10,.18)`; dice 40×40 (phone 34) circle in flavour colour, rotates 180° per shuffle (.9s). Hint 14px opacity .6. Total label 13px (phone 12) opacity .6; value 22px/600 tabular (phone 18). CTA h52 (phone 46), padding `0 24px` (phone `0 18px`), bg `rgba(255,255,255,.7)`, blur 14, 15/600. Chooser: right 32 (phone 16), bottom 96 (phone 110), width `min(380px, calc(100% - 32px))`, padding 18, radius 24, bg `rgba(255,255,255,.92)`, blur 14, shadow `0 12px 40px rgba(0,0,0,.12)`, gap 14; selects h40 radius 12 border `--ink-line`; add button h48 bg ink text paper.
- Behaviour: see §5.3.

### 3.3 Flavours "Find your fit" — `components/home/Flavours.tsx`
- Header: `Find your fit` + ArrowButton `All collections`→/shop.
- Section padding `136px 0 120px`, gap 48 (phone `112px 0 80px`, gap 36). Row height 560, gap 12. Card padding 24, radius 28, `flex:1 0 0`, open card flex-grow 2.6. Below 1200: column, each card full width × 300px, all captions shown, no side label.
- Cards (all `<a href="/shop">`, images `alt=""`):

| Card | Match | Tint | Cover product / colour | Tilt |
|---|---|---|---|---|
| Gym wear | `category === "Gymwear"` | pistachio | gym-co-ords-set / Light Pink | -1 |
| Trousers | `"Trousers"` | lemon | wide-leg-trouser-two-full-stripes / Cherry | +1 |
| Jackets | `"Jackets"` | blueberry | ladies-vinyl-jacket / Red | -1 |
| Dresses | `"Dresses"` | strawberry | boat-neck-long-sleeve-maxi-dress / Maroon | +1 |
| New in | `p.newIn` | peach | womens-hooded-full-sleeve-cropped-puffer-jacket / Olive | -1 |

- Count pill `{n} piece(s)` (padding `7px 12px`, radius 999, bg `rgba(255,255,255,.6)`, 14/500/lh 19.6). Counts today: Trousers 6, Jackets 3, Dresses 2, Gymwear 1, New in 13. "Co-ord Set" (1 product) has no card.
- Cutout: `inset 0 0 72px` (below desktop bottom 64); height 44% closed / 78% open / 86% stacked; rotate tilt×4° (×6° when open). Name display 24/600/lh 25.2/ls -.12 (below desktop 20/21/-.1). Closed cards show a rotated side label (`bottom:211px; left:-163px; width:400px; rotate(-90deg)`, hidden below desktop).
- Image sizes attr `(max-width: 809px) 45vw, (max-width: 1199px) 30vw, 360px`.

### 3.4 NewIn "New arrivals" — `components/home/NewIn.tsx` + `components/Ticker.tsx`
- Header `New arrivals` + ArrowButton `Shop new in`→/new-in.
- Section gap 56 (phone 40), padding `120px 0 140px` (phone `80px 0 96px`).
- Up to 14 `newIn` products (catalog order). Rail: top 13, h5, radius 999, `linear-gradient(#cfcac1 0%, #8e8980 55%, #5c5850 100%)`, shadow `0 2px 4px #17140f26`. List gap 28. Hanger width 250 with hook SVG (viewBox 0 0 120 62, stroke #17140F 3) over a card 250×300, padding 22, radius 24, bg `p.tint` (fallback `#09F`), front cut-out contain. Info row padding `16px 4px 0`, 16/500/lh 20.8/ls -.08, name ellipsis + price. Link `/products/<slug>`.

### 3.5 FreshDaily "Wear the dream" + GelatoCounter — `components/home/FreshDaily.tsx`, `components/GelatoCounter.tsx`
- Two `<h1>` words `Wear the` and `dream`: display 120/600/lh .95/ls -.01em, `white-space: pre` (tablet 84, phone 54 stacked). Section padding `40px 0 140px` gap 24 (phone `24px 0 96px`). Campaign max-width 1280. Counter height 700 (tablet 600, phone 900).
- Photo `/brand/wear-the-dream.jpg` (alt `Khuwabb campaign photo`, natural size assumed 1536×864), radius 32, focusX 50 (phone 62), cycle 4s, sizes `(max-width: 809px) 200vw, 1216px`.
- Mood tags (`data/gelato-counter.json`; x,y = % of rendered photo):

| Tag | x,y | Colour | Note | Pieces (3 slugs) |
|---|---|---|---|---|
| Campus days | 9,89 | rgb(213,229,190) | Easy wide trousers and a cropped gilet for early lectures. | ribbed-drawstring-wide-leg-trouser, womens-hooded-sleeveless-cropped-puffer-jacket, wide-leg-trouser-three-half-stripes |
| Weekend plans | 20,89 | rgb(246,201,207) | Off-duty, on point — a soft jogger and a glossy puffer. | shape-high-waist-wide-leg-jogger, ladies-vinyl-jacket, wide-leg-trouser-two-full-stripes |
| Brunch dates | 31,89 | rgb(245,231,166) | Two easy maxis and a statement panelled trouser. | womens-side-pocket-cotton-maxi-dress, boat-neck-long-sleeve-maxi-dress, women-trouser-two-full-panels |
| Work mode | 42,89 | rgb(201,210,242) | Sharp seams and clean wide-leg trousers. | seam-detail-co-ords-set, cargo-pocket-trouser-for-women, women-trouser-two-full-panels |
| Winter layers | 84,89 | rgb(247,210,184) | Cropped puffers for chilly days. | womens-hooded-full-sleeve-cropped-puffer-jacket, ladies-vinyl-jacket, ribbed-drawstring-wide-leg-trouser |

- Tag: padding `8px 12px 8px 10px`, radius 12, bg `#fffdf8`, 14/600/ls -.01em, 12px colour dot; active = ink bg / paper text; transitions transform .7s, opacity .9s, bg/colour .5s (ease-out), opacity stagger `i*.08s`. Desktop transform `translate(-50%,-100%) translateY(active?-8:0) rotate(active?0:(i even?-4:3)deg)`.
- Card: padding 16, radius 24, bg `rgba(255,253,248,.82)` + blur 18, border `1px rgba(23,20,15,.06)`, gap 14 (narrow bg `#fffdf8`); 3 tiles (aspect .82, radius 16, bg mood colour, img 80% contain); name display 28/600/ls -.035em/lh 1.05; note 14/1.45/opacity .62; price 16/600 = sum of 3 prices; CTA `Shop the look` (h44, padding `0 6px 0 18px`, ink bg, 32px paper badge with arrow `M4 10L10 4M5 4h5v5`) → `/shop` (hardcoded). Float hidden state opacity 0, `translateY(24px) scale(.96)`, blur 8.
- Layout: ≥700px frame width → tags on the photo, one floating card above the active tag (width `min(320, w-32)`, clamped 16 from edges, bottom = h − y + 64). <700 → photo, then horizontally scrolling chip row of tags, then one full-width card.

### 3.6 Looks "Shop the look" — `components/home/Looks.tsx` (server component, no JS)
- Heading `Shop the look`. Section padding `120px 0` gap 48 (phone `80px 0` gap 36). List gap 40, max-width 1280 (phone gap 24).
- Card: **`position: sticky; top: 96px`** (stacking), flex gap 40, height 640, padding 24, radius 32, overflow clip, shadow `0 -12px 40px #17140f0f`, bg = look tint. Phone: column, gap 20, height auto, padding 16.
- Photo width 470 (tablet 320, phone 100%×360), radius 22, cover, position `50% 30%`. Sizes `(max-width: 809px) calc(100vw - 72px), (max-width: 1199px) 320px, 470px`.
- Name `h2` 64/52/38; description max-width 460, 20/1.45 `--ink-62` (19/17). Details padding `24px 24px 16px 0` (phone `0 8px 8px`).
- Piece rows: padding 10, gap 16, radius 20, bg `#ffffff8c` + blur 10; thumb 72×72 radius 14 white, img 60×60; name/price 16/500/lh 20.8; colour 14/500 `--ink-62`. Each row links `/products/<slug>?colour=<Colour>`, alt `<name> in <colour>`.
- Actions: ArrowButton `Shop all`→/shop; total `The look · Rs.{sum}`. **No add-to-bag.**

| id | Name | Description | Pieces | Tint | Image |
|---|---|---|---|---|---|
| daily-edit | Daily edit | A cropped puffer gilet over the ribbed drawstring trouser — easy layers for every day. | womens-hooded-sleeveless-cropped-puffer-jacket / Beige; ribbed-drawstring-wide-leg-trouser / Black | rgb(201,210,242) | /brand/looks/daily-edit.jpg |
| off-duty | Off duty | The olive cropped puffer with our cream high-waist jogger. Soft, warm and weekend-ready. | womens-hooded-full-sleeve-cropped-puffer-jacket / Olive; shape-high-waist-wide-leg-jogger / Cream | rgb(246,201,207) | /brand/looks/off-duty.jpg |
| street-ready | Street ready | High shine meets sporty stripes — the black vinyl puffer with the two-stripe wide-leg trouser. | ladies-vinyl-jacket / Black; wide-leg-trouser-two-full-stripes / Blue | rgb(213,229,190) | /brand/looks/street-ready.jpg |
| brunch-dates | Brunch dates | The boat-neck maxi in maroon: sleek, long-sleeved and made for long lunches. | boat-neck-long-sleeve-maxi-dress / Maroon | rgb(245,231,166) | /brand/looks/brunch-dates.jpg |

Alt texts: `The <Name> look: <Product> in <Colour> with <Product> in <Colour>` (generated at build time from products.json names).

### 3.7 Receipts "Seen on you" — `components/home/Receipts.tsx`
- Title `Seen on you` (64/52/38, centred, Appear rise). Section padding `120px 32px 80px`, gap 56 (phone `80px 20px 56px`, gap 40). Row wrap, centred, gap 36 (phone 28), max-width 1216.
- Receipt: width 340 (phone 100%, max 340), `cursor: grab`. Paper padding `28px 26px 22px`, bg white, radius `4px 4px 0 0`, gap 16. Brand `khuwabb` display 24/700/lh 24/ls -.36. Order/byline 14/500/lh 19.6 `--ink-62`. Dashed rule `1px dashed #17140f4d`. Lines 16/400/lh 24 (name + price); `Total` 500/lh 20.8. 5 stars 18px fill+stroke ink (`aria-label="5 stars"`, always 5). Quote 20/1.45 (19/17). Zigzag tear 14px (SVG viewBox 0 0 340 14, 17 teeth, fill #fff).
- **All three are drafts** (`draft: true`, fake customers):
  1. `Order KH-1042 · 14 Oct 2026` — seam-detail-co-ords-set, ribbed-drawstring-wide-leg-trouser — "“The co-ord is so comfortable I wore it to class three days running. Cash on delivery made it easy too.”" — Ayesha, Lahore — tilt -3
  2. `Order KH-1107 · 29 Oct 2026` — ladies-vinyl-jacket, shape-high-waist-wide-leg-jogger — "“Exchanged a size within the week, no fuss. The jogger is the comfiest thing I own.”" — Hamza, Karachi — tilt 2
  3. `Order KH-1163 · 6 Nov 2026` — womens-hooded-full-sleeve-cropped-puffer-jacket, wide-leg-trouser-two-full-stripes — "“The puffer is warm without being bulky, and the striped trousers get compliments every time.”" — Mahnoor, Islamabad — tilt -1.5

### 3.8 CareLabels — `components/home/CareLabels.tsx`
- Section flex-wrap centred, gap 20 (phone 12), padding `40px 32px 140px` (phone `24px 20px 96px`).
- Label: `width:min-content`, padding 6, radius 6, bg ink; inner stitch padding `14px 20px`, radius 3, gap 12, colour paper, `::after` `1.5px dashed #f7f3ec73`. Text 16/500/lh 20.8/ls -.08, `white-space: pre`. Icon 22px stroke 1.5 (inline paths in CareLabels.tsx:10-41).
- Labels: `Born in Lahore` (leaf, tilt -2), `Custom stitching` (needle, +2), `7-day exchange` (returns, -2), `Cash on delivery` (truck, +2). Hover rotate 0, scale 1.04.

### 3.9 Shop — `app/shop/page.tsx`, `components/shop/ShopIntro.tsx`, `components/shop/ProductGrid.tsx`
- Wrapper `.products`: column, centred, padding `0 32px 160px` (phone `0 16px 96px`).
- **ShopIntro** (`data-section="intro"`): column gap 56, padding `120px 32px 64px`. Photo ("freezer") max-w 1216, h 560, radius `200px 200px 32px 32px`, cover; `/brand/collections.jpg`, alt `Khuwabb pieces on a clothes rail: a pink trouser, black top and trouser, maroon maxi and an olive puffer`, sizes `(max-width: 1279px) calc(100vw - 32px), 1216px`, fetchpriority high. Heading row flex-wrap, align end, gap 48: h1 `All collections` display 120/600/lh .95/ls -.01em balance; note (w 300, 20/1.45 `--ink-62`) `Gym wear, co-ords, trousers, jackets and dresses. Tap anything to take a closer look.` Tablet: photo h 440, title 84, note 19. Phone: gap 28, padding `104px 16px 40px`, photo h 300 radius `160px 160px 24px 24px`, heading column gap 16, title 38/38, note 17. Entrances: photo opacity→1 scale .92→1 (delay .1, 1.4s); title y 40 (delay .5, 1.2s); note y 24 (delay .7, 1.2s), ease-out.
- **ProductGrid** (`data-section="products"`): grid `repeat(4, minmax(220px,1fr))`, gap `48px 24px`, max-w 1216. Card `<a href="/products/<slug>">`: h 360, padding `56px 24px 24px`, radius `999px 999px 28px 28px`, bg `p.tint`, front cut-out contain (`atLeast(src,360)`, alt = name, first 4 eager). Info gap 12, padding `16px 4px 0`; name/price 16/500/lh 20.8/ls -.08 (name wraps, price `white-space:pre`). Tablet 3 cols `minmax(200px,1fr)`, card h 320. Phone 2 cols `minmax(140px,1fr)`, gap `28px 12px`, card h 220 padding `36px 12px 12px`, info stacks (gap 2, padding `12px 4px 0`). No sold-out badge, no compare-at, no filter/sort/pagination; order = catalog order.
- Motion: cards rise in (`opacity 0, y 60` → shown, 1.1s ease-out, amount .15); cut-out hover spring `{bounce .45, .9}` to `rotate -3, scale 1.08, y -6`.

### 3.10 New In page — `components/new-in/NewInPage.tsx`
- `.page` column gap 72, padding `120px 32px 160px`. Header (`data-section="new-in-page"` first child) align end gap 48 max-w 1216: arch photo 360×460 radius `999px 999px 28px 28px` (`/framer/images/YiUnZTXr74PD1drE1Th6MZvyUj4.0cgnl3i.png`, alt "", sizes `(max-width: 809px) calc(100vw - 32px), 360px`); title column gap 20 padding-bottom 12: h1 `New arrivals` 120/600/lh .95; p (max-w 440, 20/1.45 `--ink-62`) `Just dropped — fresh, easy co-ords and statement fits. New drops every week.`
- Grid (`data-section="new-in-grid"`) 4 cols `minmax(220px,1fr)`, gap `64px 28px`: hanger (hook SVG) over card h 300, padding 22, radius 24, bg tint; info as shop grid. Hover: rotate 5° spring `{bounce .55, 1.1}`, origin top.
- Tablet: photo 300×400, h1 84, p 19, 3 cols. Phone: gap 44, padding `100px 16px 96px`, header column gap 28, photo 100%×380, h1 54, p 17, 2 cols gap `40px 12px`.
- Entrances: photo scale .9 + y 40 (delay .1, 1.4s); h1 y 40 (.5, 1.2s); p y 24 (.7, 1.2s).

### 3.11 Product page — `components/product/ProductDetail.tsx` (`data-section="product"`, `data-product=<slug>`)
- Layout: grid `minmax(0,1.1fr) minmax(0,1fr)`, gap 56, max-w 1280, padding `140px 32px 140px`, `font-feature-settings: var(--text-features)`. No tablet rule. Phone: 1 col, gap 28, padding `104px 16px 96px`, media max-w 480 centred, info not sticky, name 32px.
- Media: gallery `aspect-ratio 4/5`, radius `999px 999px 32px 32px`, bg tint, img 78%×84% contain, alt `<name> in <colour>, <view> view`, sizes `(max-width: 809px) 70vw, 440px`, fetchpriority high; photo-in keyframe .6s ease-out from `opacity 0; translateY(12px) scale(.98)` on every src change. Thumbs (only if >1 view): `role=group aria-label="Photos"`, buttons 72×88, padding 8, radius 18, opacity .55 (pressed 1 + 2px ink outline offset 2), `aria-pressed`, `aria-label="front view"`/side/back, bg tint.
- Info (`position: sticky; top: 120px`, gap 22):
  - Category 14px `--ink-62`: Gymwear set → `Gymwear · top and leggings, sold as a set`; other sets → `Co-ord set · top and bottom`; else category name.
  - Name h1 display 44/600/lh 1.05/ls -.01em, `overflow-wrap:anywhere`, margin-top -12.
  - Price 22/500 (+ `<s>` compare-at 16 `--ink-62`, currently never shown because compareAt is forced null).
  - Colour fieldset: legend `Colour <b>{colour}</b>` (14px `--ink-62`, b ink 500); pill buttons (min-w 48, h 44, padding `0 16px`, radius 999, border `--ink-line`, bg white, 15px; pressed border ink + `inset 0 0 0 1px ink`).
  - Size fieldset: legend `Size`; same pills; unavailable = `--ink-62` + line-through `rgba(23,20,15,.35)` but **still clickable**. Empty: `Sizes coming soon.`
  - Add button (`data-add-to-bag`): h 56, radius 999, bg ink, paper, 16/600, disabled opacity .4. Labels in order: `Sold out in this colour` → `Choose a size` → `Add to bag` / `Added — add another` → `Sold out in this size`.
  - Sold-out colour note (14/1.5 `--ink-62`, underlined link): `This colour is sold out right now. Message khuwabb@gmail.com to ask about a restock.`
  - Facts `<dl>` (border-top `--ink-line`, padding-top 18, gap 14; dt 13 `--ink-62`, dd 15/1.5): `Description`, `Fabric`, `Care`, `Size guide` — only non-null shown (today only Description).

### 3.12 Bag button + drawer — `components/Bag.tsx`
- **Button** (`data-bag-button`, in the nav): h 44, padding `0 6px 0 18px`, radius 999, bg ink, paper, 15/600, gap 10; text `Bag` + badge (min-w 32, h 32, padding `0 8px`, bg pistachio, ink, 13px tabular). aria-label `Bag, N items`. Badge bump `scale(1.25)` 600ms `cubic-bezier(.34,1.8,.64,1)` when count rises.
- **Layer** fixed inset 0, z 9000. Scrim `rgba(23,20,15,.32)` + `blur(0→8px)` .7s ease-out. **Panel** (`data-bag-drawer`, `<aside role="dialog" aria-label="Your bag">`, `data-open`): top/right/bottom 12, width `min(460px, calc(100vw - 24px))`, bg paper, radius 28, shadow `0 30px 80px rgba(23,20,15,.25)`; slides from `translateX(calc(100% + 24px))` .9s ease-out. No media queries.
- Head padding `26px 26px 18px 28px`: title `Your bag` 28/600/ls -.03em + count (opacity .4); close 44×44 bg `rgba(23,20,15,.06)`, X `#17140F` stroke 1.8, aria `Close`.
- List `flex:1; overflow-y:auto; padding:8px 28px`. Line: flex gap 16, padding `16px 0`, separator `1px rgba(23,20,15,.08)`; thumb 92×112 radius 18 bg `#f1ece3` (img 82%); top row name + `price×qty` 16/600; `{colour} · Size {size}` 14 opacity .55; `Not available to order` 13 `#a8321e`; stepper h 38 padding 3 radius 999 border `rgba(23,20,15,.12)`, buttons 30×30 (`−` aria `One less`, `+` aria `One more`, disabled for non-orderable, opacity .3), qty 14/600; `Remove` 14 underline opacity .55. Lines stagger in: opacity .6s / transform .8s ease-out from `translateY(14px)`, delay `.25s + i*.06s`. Vanished products show `No longer available`.
- Empty (min-h 240, gap 18): arch 168×212 radius `999px 999px 22px 22px` bg `#f1ece3` with `/framer/images/YiUnZTXr74PD1drE1Th6MZvyUj4.1i1xfkl.png`; `Your bag is empty.` 18 opacity .7; CTA `Start shopping` → /shop (h 48, padding `0 22px`, ink).
- Foot padding `20px 28px 28px`, border-top: `Subtotal` + amount 18/600 (orderable lines only); note 13 opacity .55 (`data-checkout-note`): ready `Cash on delivery. Delivery charges are shown at checkout.` else `Your bag is empty.` / `Remove the pieces that are sold out or no longer available.` / `Online checkout is paused right now.`; `Checkout` link + arrow (`data-checkout`, h 56, ink, 16/600; `aria-disabled` opacity .4 when not ready).
- Free-delivery meter exists but is disabled (`FREE_OVER = 0`; copy `{price} away from free delivery` / `Free delivery unlocked`).

---

## 4. Data sources + GraphQL fields

### 4.1 Shopify Storefront API (build time only)
- Store `citbkj-yj.myshopify.com`, API `2026-10`, **tokenless** (`lib/shopify-config.mjs`). Only used by `scripts/sync-shopify.mjs` before `next build`; output `data/shopify.json` (last sync 2026-11-19T13:13:47Z, 13 products, 155 variants).
- The only query (`scripts/sync-shopify.mjs:13-24`):
  ```graphql
  query Catalog($after: String) {
    products(first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        handle title availableForSale
        options { name optionValues { name } }
        variants(first: 100) {
          nodes { id availableForSale price { amount currencyCode } compareAtPrice { amount } selectedOptions { name value } }
        }
      }
    }
  }
  ```
- Stored per handle: `title`, `colours` (option **"Color"** values, Shopify order), `sizes` (option **"Size"**), variants `{id (numeric), colour, size, price, compareAt, available}`. Product `availableForSale` and `currencyCode` are fetched but unused.

| Storefront field | Liquid equivalent |
|---|---|
| `handle` | `product.handle` |
| `title` | `product.title` |
| `options{name optionValues{name}}` | `product.options_with_values` (`option.name`, `option.values`) |
| `variants.id` | `variant.id` |
| `variants.availableForSale` | `variant.available` |
| `variants.price.amount` | `variant.price` (cents) / `product.price` (min) |
| `variants.compareAtPrice.amount` | `variant.compare_at_price` |
| `variants.selectedOptions` | `variant.options` / `variant.option1..3` |

### 4.2 Catalog — `data/products.json` + `lib/catalog.ts`
- 13 products, keys `id (=slug), slug, name, category, soldAs ("set"|"single"), price, compareAt (null), sizes, colours[], variants, details, tint, newIn, sourceUrl`.
  - `colours[]`: `{name, image: "/products/<slug>/<folder>/front.webp", views: {front, side?, back?}, ratio}`.
  - `details`: `{description, fabric: null, care: null, sizeChart: null}` (all fabric/care/size charts null).
  - `tint`: one of the five pastels (rgb). `newIn`: true for all 13.
- Generated by `scripts/build-khuwabb-data.mjs` (names, categories, prices, colour→photo-folder mapping, tints and all descriptions are hardcoded there). `data/catalog-overrides.json` is empty.
- **Shopify wins** (`withShopify`, `catalog.ts:47-55`): name ← title; price ← min variant price; compareAt forced null; sizes ← Size option; colours ← Shopify order ∩ site photo entries; variants keyed `"<Colour> / <Size>"` → `{shopifyId, available}`. Site keeps id/slug/category/soldAs/tint/newIn/details/photos.
- `canOrder(p, colour, size)` = numeric price && variant has shopifyId && `available === true`.
- `photo(p, colour)` = front image of that colour, else first colour with an image.

| slug | Shopify handle | category (soldAs) | price Rs. | colours (Shopify order) | sizes | in stock | tint |
|---|---|---|---|---|---|---|---|
| ribbed-drawstring-wide-leg-trouser | same | Trousers | 2500 | Black, White, Pink, Olive | 4–16 | 22/28 | strawberry |
| wide-leg-trouser-three-half-stripes | same | Trousers | 2500 | Blue, Cherry, Peppercorn, Brown, Mocha, Sky Blue, Pink, Black | S,M,L | 24/24 | blueberry |
| wide-leg-trouser-two-full-stripes | same | Trousers | 2500 | Blue, Cherry, Peppercorn, Brown | S,M,L | 12/12 | lemon |
| shape-high-waist-wide-leg-jogger | same | Trousers | 2500 | Cream | XS,S,M,L | 4/4 | pistachio |
| women-trouser-two-full-panels | same | Trousers | 2500 | White with red stripes, Black with white stripes | S,M,L | 5/6 | peach |
| cargo-pocket-trouser-for-women | same | Trousers | 2500 | White | M,L | 2/2 | blueberry |
| seam-detail-co-ords-set | same | Co-ord Set (set) | 3500 | Black | 4–14 | 6/6 | pistachio |
| womens-side-pocket-cotton-maxi-dress | same | Dresses | 3500 | Black, Khaki, Burgundy | S,M,L | 9/9 | lemon |
| boat-neck-long-sleeve-maxi-dress | womens-boat-neck-long-sleeve-maxi-dress | Dresses | 3800 | Black, Brown, Maroon | 4–14 | 16/18 | strawberry |
| ladies-vinyl-jacket | womens-high-shine-vinyl-puffer-jacket | Jackets | 4500 | Dark Green, Black, Red | S–XL | 4/12 | peach |
| womens-hooded-sleeveless-cropped-puffer-jacket | same | Jackets | 3500 | Beige, Olive, Black | S–XL | 4/12 | pistachio |
| womens-hooded-full-sleeve-cropped-puffer-jacket | same | Jackets | 4000 | Olive, Beige, Black | S–XL | 4/10 | lemon |
| gym-co-ords-set | same | Gymwear (set) | 4200 | Black, Warm Brown, Light Pink, Pale Yellow | S,M,L | **0/12** | blueberry |

Shopify titles that differ from the site names (Shopify is what renders): two-full-stripes → "Wide Leg Trouser with Two Stripes, No Panel"; two-full-panels → "Women’s Trouser with Two Full Panels"; side-pocket maxi → "Side Pocket Dress"; vinyl → "Ladies Vinyl Jacket"; sleeveless → "Hooded Sleeveless Cropped Jacket"; full-sleeve → "Hooded Full Sleeve Cropped Jacket".

### 4.3 Product photos
- `public/products/<slug>/<colour-folder>/<view>.webp` (front/side/back transparent cut-outs) + `-360h`, `-480h`, `-640h` variants; 496 WebP files. Folder names don't always match Shopify colour names (`off-white` = White, `white-red`, `black-white`).
- Gym set: front + back only. Separate **`black/piece-top.webp` and `black/piece-bottom.webp`** cut-outs are used by the hero reels (`components/home/Hero.tsx:34-44`, both with id `gym-co-ords-set#Black`). Light-pink / pale-yellow piece files exist but are unused.
- Brand: `public/brand/collections.*`, `wear-the-dream.*`, `looks/*.jpg` (+400/640/960w), `logo.png`. Ex-Framer images still used: intro cut-outs (6), New In header and empty-bag image (`YiUnZTXr74PD1drE1Th6MZvyUj4.*`).

### 4.4 Money and checkout
- `formatPrice` (`lib/format.ts`): `"Rs." + Intl.NumberFormat("en-US", {maximumFractionDigits: 0})` → `Rs.2,500` (no space, no decimals); blank if price unknown.
- Checkout (`lib/checkout.ts`): cart permalink `https://<domain>/cart/<variantId>:<qty>,…`, same tab. Gated by `NEXT_PUBLIC_CHECKOUT_ENABLED !== "false"` and numeric ids. No Storefront cart mutation, notes, attributes or discounts. COD/delivery are Shopify checkout settings.

Content JSON (home):
- `data/reels.json` (reels config + flavours), `data/gelato-counter.json` (campaign moods), `data/looks.json`, `data/receipts.json`: generated by `scripts/build-khuwabb-content.mjs`; looks/receipts/moods are hardcoded in that script, the rest comes from `data/framer-original/*`.
- `data/scoop-intro.json`, `data/fitting-curtain.json`: intro + curtain config.
- Unused: `data/flavour-scoops.json`, `data/newsletter-form.json` (template leftovers; the latter has `hello@scoop.store`).
- `data/image-sizes.json`: 138 keys `{ "<public path>": [{src:"<path>-<w>w.webp", w, h}] }`, consumed by `lib/img.ts` (`responsive()` → largest + srcset, `atLeast(path, minH)` → smallest variant ≥ height).

---

## 5. Behaviour

### 5.1 Nav
- Entrance: opacity .001→1, y -30→0, 1s ease-out, **delay 3.3s** (timed to the intro); instant on `/products/*`.
- Pill height animates (framer `layout`, spring bounce .1/.6s) when the phone drawer opens. Hamburger lines `{top:17}/{top:25}` → X `{top:21, rotate:±45}`. Drawer height 0↔auto.
- No scroll lock, no focus trap, no Escape. Every link is a plain `<a>` (full page loads).

### 5.2 ScoopIntro (rebuild spec)
- Runs on every full page load except `/products/*`. **No storage flag**: it replays on every navigation (every link is a full load).
- Config: brand `khuwabb` (7 letters), 5 colours (the pastels), 20 image entries cycling 6 PNG cut-outs in `public/framer/images/` (rendered as their `-240w.webp`), spins 7, speed 1, lockScroll true.
- Constants: SPIN_START .35s; spinDuration(i) = 1.35 + .2i s; SETTLED = 3.45s; TOTAL = 4.6s.
- Structure: fixed overlay z 10000, bg paper, pointer-events none, aria-hidden → row (gap `min(1.4vw,16px)`) → per letter an arch (width `min(88/7 vw, 250px, 43.48vh)`, height ×1.38, radius `999px 999px 22px 22px`, colour COLORS[i%5]) → reel of 7 cells (6 image cells, 78% frame, bg COLORS[(i+a+1)%5], image `IMAGES[(i*3+a*5)%20]`; last cell = the letter in Clash 600 at arch-w×1.05, ls -.04em, translateY 4%).
- Animations: arch `siIn .7s ease-out (0.05+0.05i)s` (opacity 0→1, y 40→0); reel `siSpin spinDuration(i) cubic-bezier(.35,.05,.2,1) .35s` (blur 0→7px@12%→3px@70%→0@86%; overshoot to −86.7143% at 86% then −85.7143%); letter exit `siUp`/`siDown` (even/odd) 1s `cubic-bezier(.76,0,.24,1)` at (SETTLED + .06i)s to ∓115vh; root `siBg .9s` at SETTLED+.15 (bg → transparent), `siOut` at SETTLED+1.1.
- Locks `documentElement.style.overflow = hidden` until TOTAL+80ms (4680ms), then removes the node.
- Reduced motion: overlay just fades (`siOut .8s`), no lock, removed after 880ms.

### 5.3 Reels (rebuild spec — `ScoopReels.tsx:192-516`)
- One rAF loop writes transforms directly; pauses off-screen (IntersectionObserver) and when the tab is hidden; ResizeObserver for size.
- Layout (`rowLayout :63-87`): mobile = width < 640; `top = max(h*topInset, mobile?92:112)`; `bar = mobile?132:112`; `look = max(120, h−top−bar)*lookScale`; `y0 = top + (h−top−bar−look)/2`. Tops: `h = look*.44`, `w = min(h*.92, W*(mobile .46:.3))`, `cy = y0 + h/2`, `step = w*(mobile 1.02:1.18)`, img object-position `50% 100%`. Bottoms: `h = look*.51`, `w = min(h*.7, W*(mobile .36:.26))`, `cy = y0 + look*.49 + h/2`, `step = w*(mobile 1.16:1.4)`, object-position `50% 0%`.
- Curved track `slot(rel)` (`:90-107`): `k = .34*curve + 1e-4`; `angle = rel*k`; `R = step/k`; `x = R*sin(clamp(angle,±1.5))`; `depth = R*(cos−1)`; `persp = 2.6R + 400`; `scale = persp/(persp−depth) * (d<1 ? 1−.3d : .7−.06(d−1))`; opacity `|angle|<1.45 ? clamp(1.25−.22d,0,1)*clamp((1.45−|angle|)/.25,0,1) : 0`; blur `clamp(d,0,2.5)*sideBlur + clamp(|vel|*.32,0,5.5)` (rounded to .5px, applied >.25); `rotateY = −22*angle deg`; z `round(100−10d)` (+200 tops). Transform `translate3d(cx+x−w/2, cy−h/2, 0) perspective(900px) rotateY() scale()`.
- Drag: pointerdown on a row; window pointermove `off += −dx/step`, `vel = .6vel + .4(delta/dt)`; moved > 6px → drag (preventDefault). Release → spring to `round(off + clamp(vel,±30)*.22)` with `a = −90(off−target) − 17vel`. Tap (<6px) on a piece → tween it to centre (`650 + 90|by|` ms, cubicOut). No wheel. `touch-action: pan-y`.
- Shuffle: per row pick a random index ≠ current (and a different product when possible); spin direction tops +1, bottoms −1; ≥1 full lap; tween `backOut(s=.7)` over `1500 + 260ri` ms with `140ri` ms delay. Background flavour advances by 1 (5-cycle); dice rotates 180°; tags hide and total dims to .35 until settled.
- Intro (mount, not reduced motion): rows start parked off-ring and spin to index 0 after `introDelay` 2.9s (in sync with ScoopIntro). Tags/total stay dimmed until it settles.
- Name tag per row shows when the row is settled: piece name + price; desktop at `x = min(cx + .52w + 14, W − tagW − 12)`, phone hugs right edge; `y = cy − .12h`.
- Images: only centre ±1/±2 load first; the rest of the ring loads on `requestIdleCallback` after `load`. `sizes`: tops `(max-width: 639px) 46vw, 30vw`, bottoms `(max-width: 639px) 36vw, 26vw`.
- "Add the look": CTA intercepts click when pieces are centred and opens an in-hero chooser (one row per unique product, colour preselected from the centred piece, size placeholder, size options disabled unless `canOrder`). "Add to bag" adds every item (qty 1) via `addToBag` → localStorage + opens the bag. Closes only via ×.
- Reduced motion: no intro, 1ms tweens.

### 5.4 Other home motion
- Flavours: `open` starts on the first card; `mouseenter` opens a card (no mouseleave, no focus/tap handler); spring `{bounce .15, .9}` on flex-grow, rotate, height, caption/side opacity. Row enters with Appear `lift`.
- NewIn Ticker: leftward 34 px/s rAF marquee with cloned sets; pauses fully on hover; pointer drag > 6px moves it (no momentum) and swallows the click; not gated by visibility; no reduced-motion handling. Hanger hover: rotate 5° spring `{bounce .55, 1.1}`, origin top.
- FreshDaily words: scroll-linked (`start end`→`end end`) x ∓180→0 and opacity .2→1, linear.
- GelatoCounter reveal: rAF reads rect; `target = clamp((vh − top)/(.85vh),0,1)`, eased `+= (t−e)*.08`; `p = 1−(1−r)^3`; `clip-path: inset(0 side 0 side round R R 32px 32px)` with `side = (1−p)*(narrow?.08:.2)*W`, `R = inner/2 + (32 − inner/2)*p`; photo scale `1.08 − .08p` (origin 50% 60%). Tags fade in when reveal > .92. Auto-cycle every 4s while revealed, on screen and not hovered; hover/focus/click selects. Reduced motion → reveal 1.
- Looks: CSS sticky stacking only.
- Receipts: enter from y −80 with spring, stagger .15/.33/.51s, replay; free drag with momentum (no bounds).
- CareLabels: enter from `{y 30, rotate ±8}` to tilt with spring, stagger .1/.22/.34/.46; hover rotate 0 scale 1.04.
- Appear (SectionHeader titles, Flavours row, Receipts title): replays both directions.

### 5.5 Footer
- FittingCurtain over the whole footer (z 3, pointer-events none): two striped panels (50.5% wide, pleat 56px, `repeating-linear-gradient` of shades of rgb(213,229,190) left / rgb(246,201,207) right; shade(c,t): t≥0 → v+(255−v)t, t<0 → v(1+t); stops −.14/.05/.38/.08/−.1/−.14 at 0/.22/.45/.68/.9/1 × pleat), 36px inner fold gradient, 26px hem, 12px rod `linear-gradient(180deg,#ECE8E0,#B4AFA6 55%,#77726A)`. Opens (translateX to leave 56px, phone 16px visible) over 2.2s `cubic-bezier(.65,0,.35,1)` with .15s delay when ≥30% visible; closes again when scrolled back above (replay). Reduced motion: open immediately.
- Newsletter states `idle | bad | sending | done` on `data-state`: invalid → red border + error fade .3s; valid → opens `mailto:khuwabb@gmail.com?subject=Sign%20me%20up&body=Please%20add%20me%20to%20the%20list%3A%20<email>` then shows `done`: input/button fade .4s and a pistachio overlay reveals with `clip-path: circle(0% at 90% 50%) → circle(150% at 90% 50%)` 1s, check icon + success copy, `aria-live="polite"`.
- Social hover bg .08 → .18, .3s ease-out.

### 5.6 Product page
- State: colour (initially first colour), size (empty), view (front), added.
- `?colour=<Name>` read **once after mount** (exact, case-sensitive); URL never written; no `?variant`/`?size`. Brief default-colour flash.
- Colour change keeps size and view (falls back to front if the colour lacks that view; tests assert "colour switch keeps the chosen view").
- Add → `addToBag([{slug, colour, size}])` → localStorage, `khuwabb-bag-change`, `khuwabb-bag-open`; label becomes `Added — add another`. Same line again → qty + 1.

### 5.7 Bag + localStorage
- Key **`khuwabb-bag`**: `[{slug, colour, size, qty>0}]`; validated on read; name/price/image/orderability always re-derived from the catalog (stale/forged lines show `Not available to order` and block checkout).
- Window events `khuwabb-bag-change` and `khuwabb-bag-open`; cross-tab `storage` sync.
- Opens on bag button, `khuwabb-bag-open`, every add. Closes on scrim, ×, Escape, empty-state CTA.
- Scroll lock via `documentElement.style.overflow = hidden`. **No focus trap, no focus move/restore, no `aria-modal`, closed drawer stays tabbable.**
- `−` to 0 removes; `Remove`; `+` disabled for non-orderable lines; no max qty/stock cap. Subtotal counts orderable lines only. Badge reads 0 until hydration.

### 5.8 Checkout hand-off
Order of checks: empty → any non-orderable line → checkout disabled → non-numeric id → ready (permalink). When not ready the link has no href, `aria-disabled`, click prevented.
Stock is a build-time snapshot; out-of-stock variants are shown (struck), not hidden.

### 5.8a Existing visual-compare states (`scripts/compare.config.mjs`) — reuse for the theme compare tool
- Home sections: `nav, hero, flavours, new-in, fresh-daily, looks, receipts, care-labels, footer` via `[data-section="<name>"]`; intro-gated captures at 6500ms after load.
- States: `hero/intro` (frames 0…6500), `hero/shuffle` (click `[data-shuffle]`, frames 0–2400 step 300), `flavours/hover` desktop only (hover `[data-card="Jackets"]`), `nav/menu-open` mobile only (click `[data-menu-toggle]`), `bag/open` (click `[data-bag-button]`). `/shop`: intro load + `card-hover` desktop; `/new-in`: header load + `hanger-hover` desktop; `/products/seam-detail-co-ords-set`: product section.
- Reels randomness is seeded via `reelsRandom` (seed 11) so both sides shuffle identically; the theme's reels JS should expose the same hook name.
- Inline CSS vars: `--i` (bag line index), `--arch-w`, `--spin-end`, `--spin-overshoot` (intro), `--flavour` (reels dice).

### 5.9 Reduced motion summary
Handled: ScoopIntro (CSS + JS), FittingCurtain, GelatoCounter, ScoopReels. **Not handled**: Nav entrance/drawer, Appear, ArrowButton, Ticker, NewIn hanger, Flavours, Receipts, CareLabels (no `MotionConfig reducedMotion`).

---

## 6. Third parties
- `next` 15 (App Router, `next/font/local`, `usePathname`), `react` 19, `framer-motion` 14 (`m`, `AnimatePresence`, `LazyMotion`+`domMax`, `useScroll`, `useTransform`, `useAnimationFrame`, `useMotionValue`, `wrap`).
- Fonts self-hosted (no CDN). No analytics. No icon library.
- External URLs: social root domains only; Shopify (see §4).
- Dev/tooling: Playwright, Lighthouse, pngjs, sharp-style image scripts (`scripts/`).

---

## 7. Risks with no direct Liquid equivalent
1. **Reels engine** (rAF 3D ring, drag/spring/tween physics): pure JS custom element; Liquid only emits a JSON payload.
2. **Per-colour cut-out images** (front/side/back per colour) used by reels, category cards, ticker, looks, campaign tiles, product page. Shopify has no native "image per option value per view" model → needs a convention (variant images + alt text) or metafields/metaobjects.
3. **Gym set** as two separate reel pieces (top/bottom cut-outs) on one product.
4. **Category / newIn / tint** are custom fields → collections, product type, tags or metafields.
5. **Hardcoded content** (moods, looks, receipts, care labels, category cards, nav/footer) → section settings, blocks, menus, metaobjects.
6. **framer-motion** (springs, `layout`, AnimatePresence height:auto, whileInView replay, drag with momentum, scroll-linked transforms): CSS transitions + IntersectionObserver + small JS; springs approximated (e.g. CSS `linear()` easing).
7. **next/font** metric-matched fallback is generated by Next and not in source; must be computed or accepted as a small FOUT difference.
8. **Responsive images** from `data/image-sizes.json` → `image_url` widths; theme assets (intro PNGs, brand photos) need `asset_url` or Files.
9. **ScoopIntro** blocks the screen ~4.7s and locks scroll on every page load; on Shopify every navigation is a full load (same as now) but it would also run on collection/cart/search/account pages.
10. **Money format**: `Rs.` + en-US grouping + 0 decimals via `Intl` vs Shopify `money` filters (store money format).
11. **Duplicate `<h1>`s**: footer `Dressed in dreams`, FreshDaily words.
12. **Newsletter** is a `mailto:` → Shopify `{% form 'customer' %}`.
13. **Sticky Looks cards** break if any theme wrapper sets `overflow: hidden`.

14. **Bag = localStorage, keyed `slug|colour|size`** → Shopify Cart AJAX (`/cart/add.js`, `/cart/change.js`, `/cart.js`, Section Rendering API) keyed by variant id; badge/drawer refresh after each call; handle 422 (over-stock) which has no UI today. Live `variant.available` replaces the build-time snapshot.
15. **Checkout permalink** → native cart form / `routes.cart_url` → checkout. `NEXT_PUBLIC_CHECKOUT_ENABLED` → theme setting if still wanted.
16. **Custom product fields** with no Shopify equivalent: `tint`, `soldAs`, `category`, `newIn`, `details.fabric/care/sizeChart` → metafields / product type / collections.
17. **Option names** must stay exactly `Color` and `Size` (the theme will look them up by name).
18. **compare_at_price**: the Next app forces it off; Shopify data would turn the strike-through on unless the theme also ignores it.
19. **Accessibility gaps to fix, not copy**: bag drawer focus trap/restore/`aria-modal`/inert when closed; nav drawer has none either.
20. **Test hooks** (`data-section=…`, `data-bag-button`, `data-bag-drawer`, `data-checkout`, `data-checkout-note`, `data-add-to-bag`, `data-product`, `data-menu-toggle`, `data-card`, `data-shuffle`, `data-add-look`, `data-look-chooser`, `data-look-add`, `data-intro`) are used by `scripts/test-store.mjs` / `compare.config.mjs`; the theme should keep them so the existing tests and the compare tool can target both sites.

---

## 8. Open questions (needs Shad's answer unless noted)
1. Should the intro replay on every page load (current behaviour) or once per session? Which Shopify templates play it?
2. Newsletter: Shopify customer marketing signup (recommended) instead of `mailto:`?
3. Payment icons exist but aren't shown — show Shopify's `payment_type_svg_tag` icons in the footer, or keep hidden?
4. Real social profile URLs?
5. Draft reviews in "Seen on you": port as placeholders (hidden by default?), use a reviews app, or drop?
6. Category cards and "Shop the look" CTAs all link to `/shop`, not to their category: keep or link to collections?
7. Every product is flagged `newIn` (13/13). Intentional?
8. "Co-ord Set" has no category card and "Gymwear"/"Gym wear" naming differs: what are the intended Shopify collections?
9. ArrowButton light tone arrow is near-invisible (#000 on ink): fix or match?
10. Satoshi 600 is requested but not loaded (renders 500): match rendered output (safe default) or ship a 600 face?
11. `/search` has no page in Next.js: design Shopify search from the existing tokens (safe default)?

12. Canonical product names: Shopify titles (rendered today, e.g. "Side Pocket Dress") or the site's longer names? (Safe default: Shopify titles, as now.)
13. Show `compare_at_price` sale prices? (Safe default: hide, as now.)
14. Free-delivery meter: wanted, and at what threshold? (Safe default: off, as now.)
15. Fabric / care / size chart: will they be filled in as metafields? Size guide format (text, image, table)?
16. `tint` per product: a product metafield (deliberate per product, e.g. gym set on blue "so Light Pink stands out") — confirm.
17. Sleeveless/full-sleeve jackets: Shopify sells XL, the site data lists S–M–L. Shopify wins today — confirm XL is real.
18. Gym set fully sold out (0/12): expected?
19. Is COD + delivery charge configured in Shopify checkout (the bag note promises both)?
20. SEO: add meta descriptions / OG / product JSON-LD in the theme? (Safe default: yes, Shopify standard `{{ page_description }}` + product JSON-LD; it's additive.)
21. Old URLs `/products/boat-neck-long-sleeve-maxi-dress` and `/products/ladies-vinyl-jacket`: add Shopify URL redirects?
22. Dead data/template leftovers (`data/bag-button.json` "€"/"Nothing scooped yet.", empty `data/add-to-bag.json`, `flavour-scoops.json`, `newsletter-form.json`, `public/framer/assets/*`, payment SVGs): ignore in the port (safe default).
23. `scripts/test-store.mjs:236` expects `/opens soon/` copy that `lib/checkout.ts` no longer produces — stale test (not a theme issue).

# Parity: footer (Footer, NewsletterForm, FittingCurtain)

Theme files: `theme/sections/footer.liquid` (S), `theme/snippets/footer-social.liquid` (SOC), `theme/snippets/newsletter-form.liquid` (NL), `theme/snippets/fitting-curtain.liquid` (FC), `theme/assets/section-footer.css` (CSS), `theme/assets/footer.js` (JS), `theme/assets/icon-{instagram,tiktok,pinterest}.svg`.
Class mapping: `.footer`->`.footer`, `.newsletter`->`.footer__newsletter`, `.title`->`.footer__title`, etc.; NewsletterForm `.root/.form/.done/.error` -> `.newsletter-form`, `.newsletter-form__form/__done/__error`, `form input/button` -> `__input/__button`.

## 1. Footer.module.css

| Source | Rule | Theme |
|---|---|---|
| Footer.module.css:1-13 | `.footer` position relative, flex column, center, gap 160, w100%, min-h 900, padding 220 96 32, overflow clip, bg ink, color paper | CSS `.footer`; markup S `<footer class="footer" data-section="footer">` |
| :15-24 | `.newsletter` relative z1 flex col center gap 28 w100% max 900 | CSS `.footer__newsletter` |
| :26-35 | `.title` display font 120/600/.95, ls -.01em, center, balance, paper | CSS `.footer__title`; S `<h2>` (G6) |
| :37-46 | `.lede` max 520, body 20, lh 1.45, ls -.01em, center, balance, paper .7 | CSS `.footer__lede` |
| :48-51 | `.form` w100% max 520 | CSS `.footer__form` |
| :53-61 | `.bottom` relative z1 flex col gap 40 w100% max 1216 | CSS `.footer__bottom` |
| :63-70 | `.columns` relative flex wrap gap 48 w100% padding 40 0 0 | CSS `.footer__columns` |
| :72-78 | `.columns::after` absolute inset 0, border-top 1px #f7f3ec24, no pointer events | CSS `.footer__columns::after` |
| :80-87 | `.column` flex col gap 12, `flex:1 0 0`, w 1px, min-w 160 | CSS `.footer__column` |
| :89-95 | `.heading` body 16/500/20.8px/-0.08px | CSS `.footer__heading` |
| :97-103 | `.link` body 16/400/24px paper .7 | CSS `.footer__link` |
| :105-108 | `.follow` flex gap 10 | CSS `.footer__follow` (SOC) |
| :110-118 | `.social` 48x48 circle, centred, bg paper .08 | CSS `.footer__social` |
| :120-129 | `.icon,.payment` mask contain/no-repeat/center | CSS `.footer__icon` (payment half dropped, G16) |
| :131-135 | `.icon` 20x20 bg paper | CSS `.footer__icon` |
| :137-143 | `.legal` flex wrap space-between center w100% | CSS `.footer__legal` |
| :145-151 | `.legal p` body 14/500/19.6px paper .5 | CSS `.footer__legal p` |
| :153-162 | `.payments`, `.payment` | Not matched (G16, payment icons hidden; never rendered in source) |
| :164-169 | `.curtain` absolute inset 0 z3 no pointer events | CSS `.footer__curtain`; S wrapper |
| :171-184 | 810-1199.98: footer gap 120, padding 200 72 32; title 84; lede 19 | CSS media block 1 |
| :186-210 | <=809.98: footer gap 96, min-h 760, padding 140 36 28; title 54; lede 17; columns gap 32; legal column/flex-start/gap 16 | CSS media block 2 |
| Footer.tsx:9 | EMAIL `khuwabb@gmail.com` | global setting `contact_email` (S `email`) |
| :11-36 | COLUMNS Shop/Help/Khuwabb with links | S: menus `menu_1..3` (defaults footer-shop/help/khuwabb, heading = menu title); built-in fallback links verbatim when a menu is missing/empty (`/shop`->`/collections/all`, `/new-in`->`/collections/new-in`, `/#looks`) |
| :38-42 | SOCIAL Instagram/Tiktok/Pinterest, placeholder hrefs | SOC from `settings.social_*_link`; aria-label "Instagram"/"Tiktok"/"Pinterest" (source casing kept); blank URL hides the network |
| :44 | `mask()` url | SOC inline `mask-image: url({{ asset_url }})` |
| :71-80 | social hover `rgba(247,243,236,.18)`, .3s ease [.22,1,.36,1] | CSS `.footer__social` transition `background-color .3s var(--ease-out)`, `:hover` .18 |
| :85 | `© 2026 Khuwabb. Born in Lahore.` | S `© {{ 'now' \| date: '%Y' }} Khuwabb. {{ legal_text }}` |
| :50 | `<h1>` "Dressed in dreams" | S `<h2>`, setting `title` |
| :51 | lede copy | setting `lede` |
| :52-54 | form wrapper | S `show_newsletter` gates `.footer__form` |

## 2. NewsletterForm.module.css / NewsletterForm.tsx

| Source | Rule | Theme |
|---|---|---|
| NewsletterForm.module.css:1-6 | `.root` w100%, body font, paper | CSS `.newsletter-form` (+ `display:block`); `data-code-component` kept on the element (base.css resets font features) |
| :8-19 | `.form` pill: relative flex center gap 8, padding 6 6 6 22, r999, bg paper .08, 1px border paper .16, border-color .3s ease, overflow hidden | CSS `.newsletter-form__form` (a div inside the Shopify `<form>` shell, see Not matched) |
| :21-23 | bad: border #f3a0a0 | CSS `.newsletter-form[data-state="bad"] .newsletter-form__form` |
| :25-36 | `input` flex 1, min-w 0, h 50, no border/outline, transparent, paper, font inherit 16, opacity .4s ease | CSS `.newsletter-form__input` (+ `padding:0`, UA reset) |
| :38-40 | placeholder paper .5 | CSS `.newsletter-form__input::placeholder` |
| :42-58 | `button` shrink 0, h 50, padding 0 24, r999, pistachio/ink, 15/600, pointer, scale(1), transition transform .5s [.22,1,.36,1], opacity .4s ease | CSS `.newsletter-form__button` |
| :60-62 | hover scale 1.04 | CSS `.newsletter-form__button:hover` |
| :64-66 | sending: button opacity .6 | CSS `[data-state="sending"] .newsletter-form__button` |
| :68-71 | done: input+button opacity 0 | CSS `[data-state="done"] __input, __button` |
| :73-75 | done button hover scale 1 | CSS `[data-state="done"] __button:hover` |
| :77-92 | `.done` overlay absolute inset 0, flex centre gap 10, 15/600, pistachio/ink, r999, clip-path circle(0% at 90% 50%), 1s cubic-bezier(.65,0,.35,1), no pointer events | CSS `.newsletter-form__done` (easing = `var(--ease-in-out)`) |
| :94-96 | done: circle(150% at 90% 50%) | CSS `[data-state="done"] .newsletter-form__done` |
| :98-105 | `.error` h 22, padding 8 0 0 22, 13px, #f3a0a0, opacity 0, .3s ease | CSS `.newsletter-form__error` |
| :107-109 | `[data-show]` opacity 1 | CSS `[data-state="bad"] .newsletter-form__error` (state-driven rather than `data-show`) |
| NewsletterForm.tsx:8 | regex `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` on trimmed value | JS `IS_EMAIL` in footer.js |
| :12 | states idle/bad/sending/done | `data-state` on `<newsletter-form>`; JS sets bad/sending/idle; server renders done/bad |
| :14-24 | submit: invalid -> bad; valid -> sending, then mailto, then done | JS: invalid -> `preventDefault` + bad; valid -> sending + native POST to Shopify (G5). Done = server `form.posted_successfully?` after redirect to `#FooterNewsletter` |
| :37-40 | typing clears bad | JS `input` listener |
| :36 | input disabled when done | NL `disabled` when state is done |
| :28 | `noValidate` | NL `novalidate` on the form |
| :29-35 | email input, aria/placeholder "Your email", required | NL `type=email name="contact[email]" required`, aria-label locale `newsletter.label` ("Your email"), placeholder setting `newsletter_placeholder` |
| :42 | "Subscribe" | setting `newsletter_button` |
| :43-48 | done region `aria-live=polite`, check svg 18px path, success copy | NL markup; copy = setting `newsletter_success`, rendered only when done |
| :50-52 | error copy "That email doesn’t look right" | setting `newsletter_error`; always in DOM, visible only in `bad` |
| (new) | `contact[tags]=newsletter`, `{% form 'customer', id: 'FooterNewsletter' %}`, server error -> bad, server success -> done | NL |

## 3. FittingCurtain.tsx / fitting-curtain.json

| Source | Detail | Theme |
|---|---|---|
| FittingCurtain.tsx:20-30 | `rgb()` parse hex / rgb | FC uses Liquid `color_extract` |
| :33-37 | `shade(c,t)`: t>=0 `v+(255-v)t`, t<0 `v(1+t)`, rounded, clamped | FC Liquid loop (same maths; clamp unnecessary for t in [-.14,.38]) |
| :39-40 | `repeating-linear-gradient(90deg, shade -.14 0px, .05 w*.22, .38 w*.45, .08 w*.68, -.1 w*.9, -.14 w)` | FC `stops_t`/`stops_p`, output inline `background` per panel (precomputed closed state, no flash) |
| :44-53 + json | defaults leftColor `#D5E5BE`/`rgb(213,229,190)`, rightColor `rgb(246,201,207)`, edge 56, edgeMobile 16 (json; TSX default 18), pleat 56, duration 2.2, delay .15, threshold .3, replay true, rod true | settings `curtain_left` `#d5e5be`, `curtain_right` `#f6c9cf`, `curtain_edge` 56, `curtain_edge_mobile` 16, `curtain_pleat` 56, `curtain_duration` 2.2, `curtain_delay` 150 ms, `curtain_threshold` 30 %, `curtain_replay`, `curtain_rod` |
| :55-65 | width via ResizeObserver, initial 1200 | JS `setCompact` toggles `[data-compact]` when element width < 640 |
| :67-84 | reduced motion -> open; IO threshold clamp 0..1; intersect -> open; not intersecting and replay and `boundingClientRect.top > 0` -> close | JS `connectedCallback` (`data-open`) |
| :86 | `visibleEdge = width < 640 ? edgeMobile : edge` | CSS `--curtain-edge` (`[data-compact]` swaps desktop/mobile var) |
| :89 | panel `top: rod ? 10 : 0`, bottom 0, side 0, width 50.5% | CSS `.fitting-curtain__panel`, `--rod` modifier top 10px, `--left/--right` |
| :93 | panel background | FC inline style |
| :94 | open: `translateX(calc(-100% + edge))` / `(calc(100% - edge))`; closed `translateX(0) skewY(0deg)` | CSS `[data-open] .fitting-curtain__panel--left/--right`; base `transform: translateX(0) skewY(0deg)` |
| :95 | origin `0% 0%` / `100% 0%` | CSS `--left`/`--right` `transform-origin` |
| :96 | `transform {duration}s cubic-bezier(.65,0,.35,1) {open?delay:0}s`, will-change | CSS `.fitting-curtain__panel` + `[data-open]` delay; var `--curtain-duration` / `--curtain-delay` |
| :99-106 | hem 26px, gradient 180deg rgba(23,20,15,0)->.16 | CSS `.fitting-curtain__hem` |
| :107-116 | fold 36px, 90deg (left, right:0) / 270deg (right, left:0), stops rgba(255,255,255,0)0%, .28 60%, rgba(23,20,15,.12) 100%; opacity 1->0; `opacity duration*.6 s ease` with delay when open | CSS `.fitting-curtain__fold` (+ per-side), `[data-open]` opacity 0 + delay |
| :119 | wrapper relative 100%x100%, overflow hidden, pointer-events none, aria-hidden | `<fitting-curtain>` `.fitting-curtain` display block + `aria-hidden="true"` |
| :126-136 | rod: left/right 0, top 0, h 12, gradient `#ECE8E0, #B4AFA6 55%, #77726A` | CSS `.fitting-curtain__rod`; only rendered when `curtain_rod` |
| Footer.module.css `.curtain` | z 3 above content z 1 | CSS `.footer__curtain` |

## 4. Breakpoints

| Breakpoint | Where |
|---|---|
| >=1200 (base) | CSS base rules |
| 810-1199.98 | CSS `@media (min-width: 810px) and (max-width: 1199.98px)` (footer padding/gap, title 84, lede 19) |
| <=809.98 | CSS `@media (max-width: 809.98px)` (footer, title 54, lede 17, columns gap 32, legal column) |
| curtain element width < 640 | JS ResizeObserver -> `[data-compact]` |

## 5. States

| State | Where |
|---|---|
| Newsletter idle | default, `data-state="idle"` |
| bad (client) | JS on invalid submit; red border + error fade (CSS) |
| sending | JS before native submit; button opacity .6 |
| done (server success) | `form.posted_successfully?` -> `data-state="done"` + success text server-rendered; overlay clip-path reveal plays on load |
| bad (server error) | `form.errors` -> `data-state="bad"`, email value kept |
| Curtain closed | server-rendered default (no `[data-open]`) |
| Curtain open | JS IO intersect >= threshold |
| Curtain replay | JS: not intersecting + top > 0 (left through the bottom) + `curtain_replay` |
| Social hover | CSS `.footer__social:hover` |
| Reduced motion | Curtain: JS opens immediately and CSS removes transitions; newsletter overlay/button transitions removed. |
| No JS | `.no-js .fitting-curtain` hidden (otherwise it would cover the footer forever) |

## 6. Text strings

| String | Where |
|---|---|
| Dressed in dreams / lede | settings `title`, `lede` |
| Shop / Help / Khuwabb (headings), link labels | menus; fallbacks inline in S |
| Your email | setting `newsletter_placeholder`; aria-label locale `newsletter.label` |
| Subscribe / success / error | settings |
| `© 2026 Khuwabb. Born in Lahore.` | S + setting `legal_text` |
| social names | SOC inline |

## Not matched / differences

- Payment icons (`.payments`, `.payment`): hidden in source too; not ported (G16).
- Mailto flow replaced by Shopify customer form (G5). Mailto body/subject not used.
- Done state only appears after the server redirect (page reload to `#FooterNewsletter`); the source shows it instantly client-side. Visual states are the same.
- Structure: the Shopify `<form>` is the outer shell and the pill is a `div` inside it (so that the error line sits outside the pill and `data-state` can be computed from `form.*` before the element renders). Visually identical.
- Added `:focus-within` outline on the pill (the source removes the input outline; a11y addition per G15).
- `curtain_delay` is stored in ms (range 0-2000 step 50, default 150) instead of seconds, because Shopify's range schema rejects steps that are not multiples of 0.1 and 0.15 can't be a 0.1-step default. Rendered value identical (0.15 s).
- Curtain edge (mobile) default 16 (fitting-curtain.json) rather than the TSX prop default 18.
- Section headings fallbacks and fallback link labels are inline English in the section (no locale keys exist for them).
- Curtain gradients are only recomputed on section render (editor reloads the section on setting change), not live in JS.
- `data-show` attribute on the error element replaced by `[data-state="bad"]` on the parent.
- Not verified visually (Stage A).

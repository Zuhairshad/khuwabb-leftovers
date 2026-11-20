# QA report — Phase 6 (Stage A)

Stage A = Claude Code web: no `shopify theme dev`, no store access, no compare
tool runs. QA here is code-level: scripted parity checks, JS run in headless
Chromium against fixture pages, static accessibility/performance review and
`shopify theme check`. Everything that needs the real store or a browser on the
real theme is listed under **Stage B** — not estimated.

Areas: **A** parity completeness · **B** functions · **C** accessibility · **D** performance + editor.

Severity: **critical** = page broken / wrong content / blocks a task · **major** = clearly visible difference or significant barrier · **minor** = small or cosmetic.

---

## Summary

| Area | Critical | Major | Minor | Status |
|---|---|---|---|---|
| A parity | 0 | 0 | 4 (1 not applicable) | ✅ reported |
| B functions | – | – | – | pending |
| C accessibility | 0 | 6 (A1–A6) | 13 (A7–A19) | ✅ reported |
| D performance + editor | 0 | 0 | 9 perf/editor (M1–M7, E1–E3, E5) | ✅ reported |

---

## A — Parity completeness

Method: postcss parse of all 22 reference CSS files (~1,500 declarations) matched against the mapped theme CSS with normalised values and media context; every JSX string/attribute + rendered data JSON searched in the theme; all `data-*` hooks from audit §7.20/§5.8a, test-store.mjs, compare config and tools/compare/pages.json; breakpoints; templates/section groups. Scripts in the session scratchpad (`qa-a/`).

Result: no missing or wrong values. 22 flagged declarations are all accounted for (19 dead code in the reference, documented as skipped; renamed/split with equal values; token indirection). 14/14 test hooks present; every compare `data-section` present. Breakpoints identical per component (809.98 / 810–1199.98 / 1199.98 / 639.98 / min 810; JS thresholds 640, 700, PHONE, BELOW_DESKTOP). All routes have templates; all section/block types and settings in templates resolve; home order matches `app/page.tsx`.

| # | Sev | Where | Expected vs actual | Decision |
|---|---|---|---|---|
| A1 | minor | Footer legal, all | Reference hard-codes "© 2026 Khuwabb. Born in Lahore."; theme prints the current year | **Keep** — identical in 2026, correct afterwards |
| A2 | minor | `<title>` on /collections/new-in | Reference literal "New arrivals · Khuwabb"; theme uses `page_title · shop.name` | **No change** — `tools/store-setup` titles the collection "New arrivals"; verify shop name = "Khuwabb" in Stage B |
| A3 | minor | Product `<title>` | Reference catalog name; theme Shopify title (G24) | **Data** — store titles are canonical (approved G24) |
| A4 | minor | Footer payment icons | Not ported (hidden in reference too, G16) | **Keep** |

---

## B — Functions

_pending_

## C — Accessibility

Method: fixture page with the real theme CSS + `header.js` + `cart-drawer.js` in headless Chromium (keyboard runs + axe-core wcag2a/aa/2.1aa/best-practice); code review for the rest; WCAG contrast computed from the tokens. **Verified in the fixture:** tab order (skip link → logo → bag → menu → main); closed header drawer and bag layer not tabbable (`inert`); phone menu Escape + focus return; bag drawer focus-in, Tab/Shift+Tab trap, Escape/×/scrim close, focus restore, scroll lock released. One `h1` per template; landmarks, dialogs, form labels/autocomplete/aria-invalid on customer/search/password forms; decorative images `alt=""`; reduced-motion paths everywhere (ticker, hero auto-shuffle, campaign cycle, intro, curtain, receipts all stop).

**No critical findings** (nothing blocks a keyboard or screen-reader user from completing a task).

| # | Sev | Where | Finding | Origin | Decision |
|---|---|---|---|---|---|
| A1 | major | Footer, all pages | Focus ring is ink on ink (invisible) | inherited | **Fix**: paper-coloured ring inside the footer |
| A2 | major | All pages | Header not in a `<header>` landmark (axe `region`) | inherited | **Fix**: `<header>` wrapper |
| A3 | major | Footer newsletter | Error not announced; no `aria-invalid`/`aria-describedby`; hidden error text always in the a11y tree | inherited | **Fix** |
| A4 | major | Bag drawer, hero bar | Text at ink .55 / .6 opacity fails 4.5:1 (3.97–4.47) | inherited values | **Shad** — fixing = slightly darker text (≥ .62 bag, ≈ .7 hero). Default: keep parity |
| A5 | major | Product | Sold-out size is visual-only; disabled add button leaves the tab order so its explanation can't be reached; label/image changes silent | inherited | **Fix**: `aria-disabled` + visually-hidden "sold out", polite live region for the button label |
| A6 | major | Home campaign (desktop) | Hidden look cards' CTAs still tabbable; keyboard focus doesn't pause the 4s auto-cycle (WCAG 2.2.2); no `aria-pressed` on tags | inherited | **Fix**: inactive floats `inert`/`visibility:hidden` after fade; focusin pauses; `aria-pressed` |
| A7 | minor | Hero chooser | × and successful add drop focus to `<body>`; add→drawer close can't restore focus | theme | **Fix**: return focus to the CTA |
| A8 | minor | Bag drawer | `<aside role="dialog">` invalid role (axe) | inherited | **Fix**: `div` |
| A9 | minor | Bag drawer | `.cart-line__remove` contrast | inherited | with A4 |
| A10 | minor | Bag / cart page | Stepper/remove labels lack the product name; cart-page qty input label; qty change not announced | mostly inherited | **Fix** |
| A11 | minor | Cart line, shop-the-look thumbs, collections list | Image alt repeats adjacent visible text | inherited | **Fix**: decorative |
| A12 | minor | Pagination | `nav` labelled "Page N" | theme | **Fix**: "Pagination" |
| A13 | minor | Gift card | `aria-labelledby` on a role-less div; QR has no name; copy announced twice | theme | **Fix** |
| A14 | minor | Home ticker | Auto-scroll pauses on hover/focus only; no visible pause control (2.2.2) | inherited | **Shad** — a pause button is a visible addition. Default: keep (reduced motion stops it) |
| A15 | minor | Header | "Bag, 1 items" plural; no `aria-haspopup="dialog"`; toggle label + aria-expanded double signal | inherited | **Fix** plural + haspopup; keep label |
| A16 | minor | Nav over dark footer | Pill links 3.42:1 over ink | inherited | Keep (parity) |
| A17 | minor | Hero, campaign | Reduced-motion read once at load | theme | Keep (low impact) |
| A18 | minor | Intro | If `scoop-intro.js` fails to load, scroll stays locked | theme | **Fix** (Opus, head-config failsafe) |
| A19 | minor | Customer/search/password forms | Field border `--ink-line` 1.29:1 (UI needs 3:1) | theme (no reference) | **Fix** in `component-form.css`; PDP option borders = parity, keep |

Contrast table: see the QA-C report in the session log; key results — ink on paper/pastels 12–17:1, `--ink-62` on paper 4.95, on strawberry/blueberry 4.42 (inherited fail), footer text 4.93–8.51, `#a8321e` 4.45–6.69.

## D — Performance + editor

Theme check: **76 files, no offenses** (errors, warnings, info). No `all_products[...]`; every range ≤ 101 steps with defaults on a step; no dead settings (footer/password settings are read through snippets); all custom elements guard redefinition and clean up rAF/observers/listeners/timers on disconnect; intro never plays in the editor.

**Weight per template** (raw → gzip; all JS `defer`; only `tokens.css` + `base.css` block in `<head>`):

| Template | CSS | JS |
|---|---|---|
| baseline (every page) | 34.4 KB → 10.9 | 21.7 KB → 7.6 |
| home | 70.4 KB → 22.2 | 78.2 KB → 24.9 (hero-reels.js 31 KB) |
| collection / new-in | ~41 KB → 13.1 | 21.7 KB |
| product | 39.5 KB → 12.6 | 32.5 KB → 10.9 |
| search | 52.7 KB → 16.0 | 21.7 KB |

Images: LCP images on collection / new-in / product are eager + `fetchpriority=high` with the reference's exact `sizes`; everything below the fold lazy; all cut-outs have width/height; srcsets capped at the original width. Fonts: 3 faces preloaded, `swap`, metric-matched Arial fallbacks.

| # | Sev | Where | Finding | Decision |
|---|---|---|---|---|
| E1 | minor | Editor, any template | `main-collection-grid`, `main-collection-hangers`, `collection-intro`, `new-in-header` have presets but no `enabled_on` → can be added to home where `collection` is undefined | **Fix** (QA-fix batch): `"enabled_on": {"templates": ["collection"]}` |
| M4 | minor | Home LCP | Hero reel pieces have no `fetchpriority` (same as reference) | **Fix**: `fetchpriority="high"` on the centre piece of each row |
| M6 | minor | Home, all | `ticker.js` rAF loop never cancelled (no-op ticks off-screen); hero `pointermove` listener always attached (same as reference) | **Fix** ticker: start/stop with its IntersectionObserver. Hero listener: keep (parity) |
| M5 | minor | Every page | `favicon.png` 512×512 / 58 KB used as icon + apple-touch-icon; logo PNG 57 KB for a 54px-tall mark (logo = parity) | **Fix** favicon (48 px icon + 180 px touch icon); logo: keep, optional later |
| E3 | minor | Editor | No `shopify:block:select` handlers — selecting a mood/flavour block doesn't preview it | **Fix** campaign moods (select → activate mood) and hero (select → set flavour); others not needed |
| M1 | minor | All, FCP | Section CSS is discovered late (links in `<body>`) | **Fix** (shared, Opus): preload `section-header.css` in `<head>`; hero CSS preload on index |
| M2 | minor | Home, cart, new-in | Duplicate `<link>`s for the same stylesheet | **Keep** — fetched once, harmless |
| M7 | minor | Home TTFB | Hero Liquid scans media per colour/view; ~90 KB JSON payload | **Measure in Stage B** before optimising |
| E2 | minor | Editor | Presets can't preset products/collections → freshly added hero/cards are empty | **Keep** — Shopify limitation; add `info` texts in the QA-fix batch |
| E5 | minor | Docs | mapping §2.2 curtain_delay unit and §2.5 step out of date | **Fixed** in docs/mapping.md |

Estimated mobile Lighthouse vs reference (80 / 90 / 91 / 91): collection, new-in, product within a few points; home is the risk (more JS/CSS, JSON payload, Shopify TTFB) — **measure in Stage B**.

---

## Stage B — must be verified on the real store

_Merged from all areas once reported._

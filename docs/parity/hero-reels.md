# Parity: hero reels

Source: `components/home/Hero.tsx`, `Hero.module.css`, `components/ScoopReels.tsx` (715 lines), `ScoopReels.module.css`, `data/reels.json`.
Theme: `theme/sections/hero-reels.liquid` (SEC), `theme/assets/section-hero-reels.css` (CSS), `theme/assets/hero-reels.js` (JS).
Stage A: code parity only; nothing here has been rendered against the store.

## 1. CSS rules

Class map (module -> theme): `.hero` -> `.hero-reels`; `.root` -> `.hero-reels__root`; `.glow/.word/.hit/.track/.piece` -> `.hero-reels__glow/__word/__hit/__track/__piece`; `.tagSlot/.tag/.tagName/.tagPrice` -> `__tag-slot/__tag/__tag-name/__tag-price`; `.bar/.left/.right` -> `__bar/__left/__right`; `.shuffle/.dice/.hint` -> `__shuffle/__dice/__hint`; `.total/.totalLabel/.totalValue/.cta` -> `__total/__total-label/__total-value/__cta`; `.chooser/.chooserHead/.chooserRow/.chooserName/.chooserPicks/.chooserAdd` -> `__chooser/__chooser-head/__chooser-row/__chooser-name/__chooser-picks/__chooser-add`.

| Source (file:line) | Theme (CSS selector) | Notes |
|---|---|---|
| Hero.module.css:1-9 `.hero` position relative, z-index 0, 100% x `100vh`, min-height 720px, overflow clip, bg `--pistachio` | `.hero-reels` | exact; not svh |
| ScoopReels.module.css:1-12 `.root` | `.hero-reels__root` | + `display:block` (custom element is inline by default) |
| :14-24 `.glow` | `.hero-reels__glow` | exact |
| :26-46 `.word` | `.hero-reels__word` | exact (600 weight renders as 500, per CLAUDE.md) |
| :48-52 `.word[data-active]` | `.hero-reels__word[data-active]` | |
| :54-59 `.hit` | `.hero-reels__hit` | top/height set by JS `applySize()` |
| :61-65 `.track` | `.hero-reels__track` | |
| :67-76 `.piece` | `.hero-reels__piece` | |
| :78-84 `.piece img` | `.hero-reels__piece img` | |
| TSX:582 inline `objectPosition` per row | `.hero-reels__piece[data-row="tops"] img` (50% 100%), `[data-row="bottoms"] img` (50% 0%) | inline style -> CSS (same result) |
| :86-92 `.tagSlot` | `.hero-reels__tag-slot` | + `visibility:hidden` until `.hero-reels__root[data-ready]` (theme addition: no tag flash at 0,0 before JS) |
| :94-116 `.tag` | `.hero-reels__tag` | exact |
| :118-126 `.tag[data-show]` | `.hero-reels__tag[data-show]` | exact |
| :128-135 `.tagName`, `.tagPrice` | `.hero-reels__tag-name`, `.hero-reels__tag-price` | |
| :137-147 `.bar` | `.hero-reels__bar` | |
| :149-153 `.left` | `.hero-reels__left` | |
| :155-170 `.shuffle` | `.hero-reels__shuffle` | |
| :172-184 `.dice` | `.hero-reels__dice` | |
| :186-188 `.dice[data-spinning]` | `.hero-reels__dice[data-spinning]` | |
| :190-193 `.hint` | `.hero-reels__hint` | |
| :195-199 `.right` | `.hero-reels__right` | |
| :201-206 `.total` | `.hero-reels__total` | |
| :208-211 `.totalLabel` | `.hero-reels__total-label` | |
| :213-218 `.totalValue` | `.hero-reels__total-value` | |
| :220-236 `.cta` | `.hero-reels__cta` | |
| :239-256 `.chooser` | `.hero-reels__chooser` | `display:flex` already in source rule |
| :258-264 `.chooserHead`, :266-273 `.chooserHead button` | `.hero-reels__chooser-head`, `... button` | |
| :275-279 `.chooserRow` | `.hero-reels__chooser-row` | |
| :281-287 `.chooserName`, :289-292 `.chooserName span` | `.hero-reels__chooser-name`, `... span` | |
| :294-297 `.chooserPicks`, :299-310 `.chooserPicks select` | `.hero-reels__chooser-picks`, `... select` | |
| :312-322 `.chooserAdd`, :324-327 `:disabled` | `.hero-reels__chooser-add`, `:disabled` | |
| :332-392 `@media (max-width: 639.98px)` (14 rules: glow 120%, word top 40%/27vw, tag padding/12px, bar 16/16/18 + wrap, shuffle 46/padding/14px, dice 34, right gap 10, totalLabel 12, totalValue 18, cta 46/18/14, chooser right 16 bottom 110, hint hidden) | same `@media (max-width: 639.98px)` block, selectors `.hero-reels__root .hero-reels__*` and `.hero-reels__hint` | exact values |
| (no source) | `.hero-reels__chooser-error` (13px, `#a8321e`, from Bag.module.css `.unavailable`) | add-failure message |
| (no source) | `@media (prefers-reduced-motion: reduce)` transitions ~0 | theme addition (CLAUDE.md pitfall) |

## 2. Constants, formulas and functions (ScoopReels.tsx -> hero-reels.js)

| Source (line) | JS location |
|---|---|
| `ROWS`, `SPIN_DIR` (:35-36), `MOBILE` 640 (:37) | top of IIFE; `ROWS` has no `shoes` (see Not matched) |
| `clamp`, `backOut(t, s=.9)`, `cubicOut` (:39-41), `wrap` (:43-47) | same names, IIFE top; exported on `Khuwabb.heroReels` |
| `reelsRandom` (:50-52) | `window.reelsRandom ||= Math.random`, called through `rnd()` at call time (G23) |
| `darken` (:54-59) | done in Liquid (word colour = channel x .955, rounded) |
| `rowLayout` (:63-87) | `rowLayout` (all constants: topInset clamp 0-.4, 92/112, bar 132/112, look max 120, lookScale .5-1.3, spacing .6-1.8, .44/.51, .92/.7, .46/.3 / .36/.26, step 1.02/1.18 / 1.16/1.4, cy .49) |
| `slot` (:90-107) | `slot` (k .34*curve+1e-4, 1.45/1.5 clamps, persp 2.6R+400, scale d<1 ? 1-.3d : .7-.06(d-1), opacity 1.25-.22d and /.25 fade, blur, rotate -22, z) |
| `Tween`/`RowState` (:109-122) | `st[row]` objects |
| `near`, `parked`, `initialNear` (:145-155) | `near()` in JS; initial set in Liquid (centre +-1, plus parked spot when `intro`); `reach` 1 phone / 2 wider at start (:480-489) |
| `canShuffle` (:164) | Liquid `hr_can_shuffle` (button hidden) and JS `canShuffle` |
| `tweenTo` (:201-205) | `tweenTo` |
| `nearest`, `centreIndex` (:206, 213-216) | same |
| `reconcile`, `fitAt`, `compatible` (:207-246) | not ported (dead code, see Not matched) |
| `go` (:248-254): `650 + 90*|by|` ms, cubicOut, 1ms reduced | `go()` |
| `shuffle` (:256-292): different product when possible, intro target 0, `laps = max(1, ceil(6/n))*n`, `ahead` per direction, intro parks at `to - dir*(max(8,n)+3)`, duration `1500 + 260*ri`, delay `140*ri + introDelay*1000`, reduced 1ms/0 delay, flavour +1 mod count, spinning, all unsettled | `shuffle(intro)` + pure `shuffleTo()`; random draw only when not intro (same call order as source) |
| `tick` (:298-402): dt cap .05, tween (backOut .7 / cubicOut), spring `a = -90(off-target) - 17 vel` thresholds .001/.01, velocity, blur rounded to .5 and applied > .25, z +200 tops, visibility hidden at opacity <= .001, tag position (`cx + w*.52 + 14` / phone `cx + w*.3`, clamp `W - tw - 12`, phone `W - tw - 14`, `y = cy - h*.12`, `tw` fallback 160), change detection -> state, autoShuffle gate (`!moving && visible && !document.hidden && !reduced`) | `tick()` |
| `onDown` (:404-416) | `onDown` (pointerdown on root, `closest('[data-row]')`) |
| `onMove` (:417-433): `off += -dx/step`, `vel = .6vel + .4 delta/dt`, preventDefault when moved > 6 | `onMove` (window, `passive:false`) |
| `onUp` (:434-455): tap threshold 6px -> `go()` to centre; else spring to `round(off + clamp(vel,+-30)*.22)` | `onUp` |
| IntersectionObserver pause (:461-468), visibilitychange (:469-475) | same, in `_init` |
| ResizeObserver (:182-190) | `ro` + `measure()` -> `applySize()` (hit zones, `data-mobile`) |
| initial: `lastInteraction = now + introDelay*1000`; intro only if `intro && !reduced && canShuffle` (:477-478) | "start" block in `_init`; `introDelayMs` is 0 when `html[data-intro-playing]` is absent (task spec) |
| idle load (:490-496): `requestIdleCallback(timeout 2000)` else `setTimeout 200`, after `load` (or immediately if complete) | `whenIdle` |
| cleanup (:502-515) | disposer returned from `_init`, run by `disconnectedCallback` |
| `centred`/`total` dedupe by id (:519-521) | `ui()` (and Liquid for the first paint) |
| `look` (:524) / `addLook` (:526-529) | `lookNow()` / `onCtaClick` |
| `sizes` attribute (:582) | Liquid `hr_sizes` (tops `(max-width: 639px) 46vw, 30vw`, bottoms `(max-width: 639px) 36vw, 26vw`) |
| `data-mobile` on root (:536) | `applySize()` |
| Hero.tsx `interleave` (:24-28), `fill` / ROW_SLOTS 12 (:23, 29), per-colour pieces (:11-17), gym pieces (:31-39), `config` (:41-47) | Liquid loops in `hero-reels.liquid` (round-robin, fill to 12, one piece per Color with a front cut-out, set piece = first colour with `piece-top` / `piece-bottom`, shared id `<handle>#<Colour>`) |
| `data/reels.json` values (autoShuffle 0, intro true, introDelay 2.9, curve 1, lookScale 1, sideBlur 2.4, spacing 1, topInset .11, topSpace 112, topSpaceMobile 92) | schema defaults (`top_inset` = 11 %, divided by 100 in the payload) |
| LookChooser (:658-715) | `<look-chooser>` class |

## 3. States

| State | Where |
|---|---|
| Intro spin | `shuffle(true)` in `_init`; rows start parked, spin to index 0 after `introDelayMs`; tags hidden (`data-show` absent) and total at .35 until all settled |
| Intro with no page intro (`data-intro-playing` absent) | `introDelayMs = 0` |
| Idle | rAF loop continues, nothing busy |
| Drag | `onDown`/`onMove`; row `drag`, tags hide, total dims |
| Flick | `onUp` spring with clamped velocity |
| Tap-to-centre | `onUp` -> `go()` (moved < 6 and `[data-idx]` hit) |
| Shuffle | `[data-shuffle]` click -> `shuffle(false)`; dice `data-spinning` until settled; flavour steps |
| Tags shown/hidden | `ui()`: `data-show` = piece exists and row settled |
| Total dimmed | `ui()`: opacity `.35` unless all rows settled |
| Chooser open | CTA click when a piece is centred -> `<look-chooser>` appended to the root |
| Chooser sold out | button label `reels.sold_out` when some product has no orderable colour x size; Add disabled |
| Add success | `Khuwabb.cart.add` resolves -> drawer opens (cart.js) -> chooser removed |
| Add error | `.hero-reels__chooser-error` shows `err.message` (422 text), chooser stays open |
| Phone layout | CSS `@media (max-width: 639.98px)` + JS `width < 640` in `rowLayout`/tags |
| Reduced motion | no intro, 1ms tweens, 0 delays, no autoShuffle; CSS transitions ~0 |
| Off-screen pause | IntersectionObserver + `visibilitychange` |
| No pieces (empty collections) | no rows, no shuffle button, CTA label `empty_cta_label` linking to `empty_cta_link` |
| Collection page hero absent | n/a |

## 4. Strings

| Text | Source | Theme |
|---|---|---|
| `Shuffle` (button + aria) | TSX:613,630 | setting `shuffle_label` |
| `Drag any row to restyle` | TSX:633 | setting `hint` |
| `The look` | TSX:637 | setting `total_label` |
| `Add the look` (CTA) | TSX:647 | setting `cta_label` |
| `Shop all` (+ `/shop`) | TSX:647, :642 | settings `empty_cta_label`, `empty_cta_link` (default `/collections/all`) |
| Chooser dialog / heading `Add the look` | :672-674 | locale `reels.add_the_look` |
| Close `×` + aria `Close` | :675 | locale `accessibility.close` |
| `<name> colour`, `<name> size` | :686, 691 | locales `reels.colour_label`, `reels.size_label` (`[name]` placeholder replaced in JS) |
| `Size` placeholder | :692 | locale `reels.size_placeholder` |
| `Add to bag` / `Sold out` | :711 | locales `reels.add_to_bag`, `reels.sold_out` |
| Add error fallback | (new) | locale `bag.error` (via `strings.error`) |
| Flavour words Campus/Weekend/Brunch/Work/Winter + colours | reels.json | `flavour` blocks (`name`, `color`) |
| Visually hidden `<h1>` | (new, G6) | `{{ shop.name }}` |
| Money | `formatPrice` | `price` snippet (server) / `Khuwabb.formatMoney` (JS) |

Hooks kept: `data-section="hero"`, `data-code-component`, `data-shuffle`, `data-add-look`, `data-look-chooser`, `data-look-add`, `data-row`, `data-idx`, `data-active`, `data-spinning`, `data-show`.

## 5. Not matched

- **Shoes row:** Hero.tsx sets `shoes: []`, so the theme (like the reference) never renders a third row; `rowLayout` keeps the shoes branch out and uses two-row proportions.
- **`fit` logic (round 2, F3):** `fitAt`/`compatible`/`reconcile` (ScoopReels.tsx:207-246) and the shared-fit draw in `shuffle()` (:257-269) are ported in full in `hero-reels.js`, and each piece JSON record carries a `fit` (`hero-reels.liquid`, read from an optional `fit:men` / `fit:women` product tag, default `"any"`). No product has that tag today, so — exactly like the reference's `Hero.tsx`, which hardcodes `fit: "any"` on every piece — the mechanism is currently a no-op; it activates the moment a product gets a `fit:men`/`fit:women` tag. Verified: dragging/tapping a row with today's data moves no other row on either site (fits-empty → `"any"` edge case), matching the reference exactly.
- **`range` steps for `spacing` and `look_scale`:** mapping says step .05; Shopify theme check rejects it ("not divisible by 0.1"), so the steps are .1 (defaults unchanged). Source values between steps stay reachable only via the template JSON.
- **Chooser for a product without a Size option:** source assumes sizes exist. Theme hides the size select and uses the implied `Default` size so Add isn't stuck disabled.
- **Chooser is a snapshot:** the source re-derives rows from the live look while the dialog is open (stale picks if the reels move); the theme uses the look at open time. A second CTA click while open does nothing.
- **Chooser keyboard (intentional improvement, F2):** the x button is unchanged; additionally Escape closes the chooser and returns focus to the "Add the look" CTA, and on open focus moves to the first (colour) select. The source has neither. No focus trap.
- **Colour without an explicit front image:** the piece falls back to that colour's variant `featured_media`; a colour with neither is skipped (source: `c.image`).
- **`hero-shuffle` compare diff (5.99% desktop / 11.45% mobile) is not a theme bug:** reproduced with Playwright + the compare tool's exact seed script (seed 11, `Math.random` and `window.reelsRandom` as two independent `make(11)` streams). The tops row always lands on the same piece on both sites; the bottoms row lands one index apart, deterministically, every run. Root cause, confirmed by instrumenting both streams: `ScoopReels.tsx`'s local `reelsRandom()` helper (line 50) calls `Math.random()` directly, not `window.reelsRandom()` — so on the reference it reads the `Math.random` stream, not the dedicated one the compare harness seeds for it. Two *unrelated* `Math.random()` calls happen inside a framework/vendor chunk during the reference's hydration, before the reels ever run, which shifts every later `Math.random()` draw (including the reels' own) one or two steps ahead of the theme's clean `window.reelsRandom` stream — so the reels' 2nd draw (bottoms) picks a different, but equally valid, option from the same piece list. Piece-list content/order was checked and is byte-for-byte identical on both sites (verified via Playwright DOM dump of `img.src` for every `[data-row="bottoms"]` piece); the `fit` work above does not touch this (fit is a no-op with today's data on both sides, confirmed by re-running the same reproduction after the change: identical 1-index-apart result, before and after). This can't be fixed from the theme side (the Next.js source is read-only and the extra draws come from its own vendor bundle, not from reels or hero code); it isn't a real product difference either (shuffle is meant to look random, and both sides land on a valid, catalogue-correct outfit). **Needs a lead decision**: accept `hero-shuffle`'s bottoms-row pick as inherently non-deterministic across the two stacks (same algorithm, same data, same seed design, but the reference's own hydration consumes from the shared `Math.random` stream first), or have the compare harness also seed `window.reelsRandom` onto `ScoopReels`' module-level `reelsRandom` specifically (e.g. by patching `Math.random` only for the exact window between page load settle and the click, which is what `settleMs`/the intro-wait already approximates but does not fully isolate).
- **Product name / URL:** pieces use `product.title` (Shopify title, G24), not the catalog's site names.
- **`piece-top` / `piece-bottom` alt:** first Color value that has the view (source hard-codes `black`).
- **Pieces are server-rendered:** the source hydrates; the theme renders the same DOM in Liquid and JS only updates it. `<img width/height>` attributes were added (theme check) and are overridden by CSS 100%.
- **Tag `visibility`:** hidden before first JS tick (see CSS table).
- **Hit zone initial position:** set on first `measure()`, source used React's initial 1200x800 until measured.
- **Runtime rendering:** the Liquid piece builder (string records, interleave, fill) is unverified against live data in Stage A.

## QA fixes (Q2: A7/B4, M4, E3, E2)
- **A7/B4 focus:** the x button now closes via `closeToCta` (chooser removed, focus to CTA, like Escape). On Add, the CTA is focused before `Khuwabb.cart.add` is called, so the drawer records the CTA as its opener (cart-drawer.js `open()` stores `document.activeElement`); on success the chooser is removed without moving focus (the drawer owns it) and on close the drawer restores focus to the CTA. On error focus returns to the chooser's Add button.
- **M4:** the centre piece (idx 0) of each row gets `fetchpriority="high"` in the server render (hero-reels.liquid); others unchanged.
- **E3:** hero-reels.js listens for `shopify:block:select`; selecting a Flavour block sets the backdrop/word to that block without spinning (`words` index = flavour index). `shopify:section:load` replaces the element, so `connectedCallback` re-inits and `disconnectedCallback` disposes (listener removed).
- **E2:** schema `info` on tops_collection, bottoms_collection, set_product: pick after adding the section (presets cannot preset products/collections).

## Perf fixes (F1: Lighthouse L1, L2)
- **L1 priority:** `fetchpriority="high" loading="eager"` now goes on exactly one image per row: the centre of the parked intro spot (`wrap(-dir*(max(8,n)+3), n)`: tops idx 9, bottoms idx 3 for 12/21+ slots) while `intro` is on, because that is what paints first and Lighthouse picked it as the LCP element; with intro off it is idx 0. Nothing else in the hero has either attribute. Supersedes the Q2/M4 "idx 0" note above. Lighthouse mobile: `lcp-discovery-insight` priorityHinted false -> true.
- **L2(a) placeholders:** server markup already rendered `src`/`srcset` only for the "nearby" set (centre +-1, plus the parked spot with intro: 6 per row, 12 total); the rest are bare `<img sizes width height alt="">` filled by `loadImg` on idle (unchanged).
- **L2(b) JSON dedupe:** `tops`/`bottoms` are now `{ order: [id...], pieces: { id: { name, price, src?, srcset? } } }`; each piece once (fill repeats ids), `handle`/`width`/`height` dropped (unused by JS), `src`/`srcset` only for ids that have a slot rendered without an image. `hero-reels.js` `expand()` rebuilds the piece arrays; `loadImg` skips pieces with no `src`. `products` is a compact record built in the section (title, url, price, colour names, sizes, variants) instead of the shared `product-json` snippet, which also carries every colour's image URLs the chooser never reads.
- **L2(c) srcset:** widths `360,480,640` (960 removed). Widest piece rendered is 274px at 1440 and 179px at 390 (probed), so x2 = 548 / 359px; 640 covers it. `sizes` strings unchanged. (The local preview's images are <= 640 wide so it never emitted 960; the saving shows on the live store, whose masters are larger.)

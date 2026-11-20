# Visual compare: Next.js reference vs Shopify theme

Captures the same page on both sites with Playwright (Chromium), then writes screenshots, a labelled side-by-side, a pixelmatch diff, computed-style comparisons for key selectors, and `out/report.html`. The older Framer-vs-Next tool is still available as `npm run compare:framer` (root).

## Install (local machine)

```
cd tools/compare && npm install
npx playwright install chromium   # only if Chromium is not installed yet
```

## Run the two servers

- Reference (Next.js, from repo root): `npm run build && npm start` (or `npm run dev`) on `http://localhost:3000`, or skip it and use `REF_URL=https://khuwabb-leftovers.vercel.app`.
- Theme: `shopify theme dev --path theme` on `http://127.0.0.1:9292`.

## Run

```
npm run compare                      # all pages, all viewports
npm run compare -- home product      # only these pages
npm run compare -- --viewport mobile
npm run compare -- home --ref-url https://khuwabb-leftovers.vercel.app --theme-url http://127.0.0.1:9292
REF_URL=... THEME_URL=... npm run compare
```

Flags: `--viewport desktop|mobile`, `--ref-url`, `--theme-url` (env `REF_URL` default `http://localhost:3000`, `THEME_URL` default `http://127.0.0.1:9292`), `--settle <ms>` (default 500), `--tolerance <px>` (default 1), `--strict` (exit 1 if any style mismatch, missing selector or capture error; otherwise exit is 0 unless the tool crashes), `--headed`, `--pages <file>`, `--out <dir>`.
Also runnable as `node tools/compare/run.mjs ...` from the repo root. `npm run selftest` (in tools/compare) checks the diff/style code offline.

## Output

`out/<page>/<viewport>/`: per-section `section-<name>--{ref,theme,side-by-side,diff}.png` (the meaningful comparison), then `ref-viewport.png`, `theme-viewport.png`, `ref-full.png`, `theme-full.png`, `side-by-side.png` (ref left/blue "REF", theme right/green "THEME"), `diff.png`, `styles.json`. Plus `out/report.html` and a console table.

Full-page shots are informational only: the Next reference uses framer-motion `whileInView`, which replays and ignores reduced motion, so everything below the fold is invisible in a never-scrolled full-page shot, while the theme shows it. Judge by the per-section diffs instead.

Reading `report.html`: one row per page x viewport. Thumbnails link to the full images. The diff column is the share of differing pixels on the full-page images (the shorter image is padded with magenta, so a height difference counts as difference; sizes are shown). Red above 5%, amber above 1%. "no reference" means the page has `ref: null`, so only the theme was captured. The key-selector table lists each selector with a status (`ok`, `mismatch`, `missing-ref`, `missing-theme`, `missing-both`); only mismatching properties are listed, highlighted red, as ref value vs theme value. `styles.json` holds the raw values for both sides. Errors (failed actions, navigation failures) are listed in red.

Style comparison: font-family compares the first family only (case-insensitive, quotes ignored); px values (also inside padding/margin/gap) within the tolerance; colours normalised to `rgba(...)`; other values compared as strings. Properties read: font-family, font-size, line-height, font-weight, letter-spacing, color, background-color, padding, margin, gap, width, height. Only the first element matching each selector is read.

## Sections

By default every `[data-section]` element found in the DOM (document order, per side, matched by name) is captured: scrolled into view (centred, or top-aligned if taller than the viewport), waited `settle + 1600ms` for in-view reveals, then element-screenshotted; the sticky nav is hidden for other sections. Key-selector styles are read after their section has been scrolled into view and settled. In theme templates, `data-section="<name>"` must sit on the section's inner root element, not on Shopify's `shopify-section-*` wrapper. Override per page with `"sections": [ "hero", { "name": "grid", "ref": "...", "theme": "..." } ]`, or `"sections": []` to disable (done for the drawer/menu pages, where an open overlay would cover the shots).

## Adding pages, actions, key selectors (`pages.json`)

```json
{ "name": "x", "ref": "/shop", "theme": "/collections/all",
  "viewports": ["desktop", "mobile"], "tolerance": 1,
  "actions": [ { "type": "click", "selector": "[data-menu-toggle]" } ],
  "keySelectors": [ "[data-section=\"hero\"]", { "name": "heading", "ref": "h1", "theme": "h2" } ] }
```

- `ref` / `theme` are paths; `null` = no equivalent on that side (only the other side is captured).
- Actions: `click {selector}`, `hover {selector}`, `selectVariant {colour, size}` (clicks a `button`, `[role=radio]` or `label` inside `[data-section="product"]` whose whole text equals the value), `openDrawer` (clicks `[data-bag-button]`, waits for `[data-bag-drawer][data-open]`), `scroll {selector}` or `{y}`, `wait {ms}`. Any action can be overridden per side: `{ "type": "click", "selector": "a", "ref": { "selector": ".x" }, "theme": { "selector": ".y" } }`. A failing action is recorded as an error and the capture continues.
- Key selectors: plain string (same on both sides) or `{ name, ref, theme }`.

## Stabilisation (both sides, identical)

- Context: `reducedMotion: "reduce"`, deviceScaleFactor 1, desktop 1440x900, mobile 390x844 (isMobile + hasTouch).
- Injected CSS: animations and transitions off, caret hidden; Shopify preview bar, cookie/consent banners and any `[role=dialog]` other than `[data-bag-drawer]` / `[data-look-chooser]` hidden.
- Init script: `Math.random` and `window.reelsRandom` are seeded PRNGs (seed 11, separate streams, so unrelated random calls don't shift the reels). The theme's reels JS must read `window.reelsRandom` at call time.
- Waits: `document.fonts.ready`, network idle (15s cap), `[data-intro]` gone or hidden, or (theme side) `html[data-intro-playing]` removed (8s cap, then continues), a lazy-image scroll warm-up, then the settle delay.
- Actions run after stabilisation; the page is re-settled before screenshots.

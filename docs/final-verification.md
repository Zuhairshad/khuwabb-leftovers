# Final verification: Khuwabb theme (2026-11-21)

Branch `themecode`. Verified at commit `a4b4942`; this report is committed on top of it.
Method: Opus planned the waves and reviewed the evidence. Haiku agents ran the mechanical checks (H1–H4) and Sonnet agents ran the browser checks and all the fixes (S1–S4, F1–F3). Every FAIL was re-checked by a fresh agent after its fix. Nothing was taken from docs/qa.md or earlier reports without being checked again.

Evidence lives in `screenshots-final/<check>/` at the repo root. It is gitignored and only exists on the machine that ran the checks.

## Environment (read this first)

- **No store access.** The Shopify CLI is not logged in for `citbkj-yj.myshopify.com`; it asks for a device login. There is no `SHOPIFY_ADMIN_TOKEN`. The claude.ai Shopify connector is signed in to a different store (Sakooon, `juj1hc-qf`), so it was not used. As a result, `shopify theme dev`, the real theme editor, real checkout, real customer accounts and live store data were **not** verified.
- **Substitute.** Wave 2 ran against the offline LiquidJS preview (`npm run theme:local`, :9292). It renders `theme/` with mock data from `data/*.json`. The reference was the Next.js **production** build (`next build && next start`, :3000) of the themecode app. The old Vercel URL now returns `DEPLOYMENT_NOT_FOUND`.
- **Read-only on the store.** Nothing was published, applied, pushed to a theme or ordered. `tools/store-setup` ran only with `--plan`, which is offline.
- **Housekeeping.**
  - Local `themecode` had diverged from the force-rewritten `origin/themecode`, so it was reset to origin. The old local pointer is kept as branch `backup/themecode-local-4417ff1`; its content is upstream as `58fae51`.
  - Halfway through, another session checked out `main` in the main checkout. The rest of the run used a separate worktree, `../Khuwableftovers-themecode`.
  - `scripts/perf-verify.sh` is left uncommitted on purpose.

## Results

| ID | Check | Result | Evidence |
|---|---|---|---|
| H1 | Repo hygiene | **PASS** | Branch themecode; working tree clean apart from the intentional `scripts/perf-verify.sh`; `rev-list --left-right --count HEAD...origin/themecode` = `0 0`. No secrets in tracked files or branch history; the only hit is the placeholder `shpat_xxx` in the README. No `console.log`/`debugger` in `theme/assets`. No TODO/FIXME/XXX in theme, tools, docs or scripts (the lead re-ran the grep and got 0 hits). |
| H2 | Theme structure | **PASS** | `shopify theme check --path theme`: **77 files, 0 offenses**, re-run after each fix round. Every file named in mapping.md exists. 31/31 section schemas parse; presets on the 12 content sections. Every `render`, `asset_url`, section type and block type resolves. No unused snippets or assets. |
| H3 | Text and locales | **PASS** (after fixes) | 1st run: 8 unused keys, plus hardcoded fallback links and the receipts "Total". 2nd run: head-meta title strings. Final: 0 missing keys, 0 unused, valid JSON, no fixed UI English outside `| t`. Setting fallbacks the merchant can edit are accepted. 0 `translation missing` or `Liquid error` across 11 rendered pages. |
| H4 | Docs current | **PASS** (after fixes) | 1st run: stage-b.md used a nonexistent `npm run store-setup`; mapping.md had stale asset names (`.jpg`/`.png`/`icon.png`), described the cart drawer as part of the overlay group, and still listed `tokens.css`/`base.css`. Final run: every command and flag exists, every asset path resolves, and every `[Shad]` decision is recorded. |
| S1 | Visual compare, all pages, desktop + mobile | **PASS** | Runs `S1c` (pages unaffected by the mid-run branch switch) and `S1d` (the 5 rows that were). Shop, New In, product and variant are each ≤0.44% full-page. Every diff >0.6% matches a recorded decision (below). The bag badge shows 0 everywhere, now that the preview gives each visitor their own cart. |
| S2 | Shopping flow | **PASS on the preview; real checkout and accounts BLOCKED** | Steps tested: variant select (Color/Size), price, URL, sold-out size; add to bag; drawer qty and remove; empty state; `/cart` qty via `updates[]`; `?variant=` preselect; search results and no-results; 404; login/register/recover markup; password page; gift card copy. No console errors (the only 404s are the bogus page itself and the CDN-only `vendor/qrcode.js`). The checkout form is the correct Shopify contract (`name="checkout"`, posting to `/cart`), but reaching real checkout needs the store. There's no discount field, low-stock message or predictive search, matching the reference, which has none either. |
| S3 | Quality | **PASS** (after fixes) | Lighthouse below. axe, 13 pages × 2 viewports × 2 motion modes: 0 open serious/critical findings. The remaining hits are covered by accepted parity decisions A4, A9 and A16, or proven to be animation-timing false positives. Keyboard: header order, mobile menu trap (fixed), drawer trap and Escape, variant picker, visible focus. All images have alt text. Reduced motion is respected. |
| S4 | Merchant side | **Static checks PASS; editor and store data BLOCKED** | Templates and settings are valid, and their values match the schema. All 12 preset sections render, including with empty blocks. Home sections can be removed one at a time without errors. Every setting is used. `setup.mjs --plan` makes no network calls. The theme's metafields (`custom.tint/category_line/fabric/care/size_guide`), menus (`khuwabb-main`, `footer-*`) and `new-in` are all created by store-setup. The additive-only guards are confirmed (`api.mjs:15-19,71-77`, `setup.mjs:32,86-95`). **Blocked:** the real theme editor; backups and undo logs (none exist, because nothing has been applied); presence of those objects on the store. |

## Lighthouse (mobile, median of 5)

| Page | Theme (preview) | Reference (Next prod) | Live store (current theme) |
|---|---|---|---|
| Home | **77** (75–79) · a11y 96 · BP 100 · SEO 100 · LCP 6.4 s · TBT 0 · CLS 0 | 79 (79–80) · a11y 89 · LCP 5.6 s | 97 (93–99) · a11y 94 · BP 77 · SEO 85 · LCP 2.0 s |
| Collection | **88** (87–88) · 100/100/100 · LCP 3.9 s | 89 (84–90) · LCP 3.8 s | not measured (Cloudflare 429) |
| Product | **95** (92–95) · 100/100/100 · LCP 3.0 s | 89 (88–90) · LCP 3.8 s | not measured (Cloudflare 429) |

The theme is within 5 points of the reference on every page (−2 / −1 / +6). The preview serves assets uncompressed and without the Shopify CDN. The live store runs a different, unrelated theme (`kw-*.css` assets), so its home score is context only, not a like-for-like baseline. JSON: `screenshots-final/LH/`.

## Expected differences (recorded decisions)

These come from docs/qa.md ("Stage B (local preview)" → expected differences) and tools/compare/README.md:
- **Home New arrivals ticker:** a different phase on each side; first-card styles are identical.
- **"Wear the dream" words:** the theme shows the reduced-motion end state, while the reference is caught mid-reveal (scroll-linked opacity).
- **404 page:** a designed page versus the Next.js default (mapping G18).
- **Image anti-aliasing.**
- **Cart drawer:** the `[data-bag-drawer]` key selector sits on the reference's overlay layer but on the theme's panel.
- **`hero-shuffle` bottom row (new, lead decision):** it lands on a different piece because Next.js hydration draws twice from `Math.random()` before the reels run, offsetting the seeded stream. The top row, frame and layout match. See docs/parity/hero-reels.md.
- **Contrast:** accepted for parity by Shad (A4/A9: bag drawer and hero bar at .55/.6 ink; A16: nav over the dark footer).

## Fixes made

| # | Fix | Files | Commit |
|---|---|---|---|
| 1 | Mobile menu focus trap (Tab/Shift+Tab wrap, Escape returns focus) | `theme/assets/header.js` | 4e94bd4 |
| 2 | Bag button accessible name contains the visible text (axe `label-content-name-mismatch`) | `theme/sections/header.liquid` | 4e94bd4 |
| 3 | Fallback nav/footer links and receipts "Total" localised; 8 unused keys removed | header, footer, reviews-receipts, `locales/en.default.json` | 4e94bd4 |
| 4 | Shop-the-look description contrast raised from 4.41 to ≥4.68:1 (62% → 64% ink) | `theme/assets/section-shop-the-look.css` | 4e94bd4 |
| 5 | Docs drift: stage-b commands, mapping asset names, cart-drawer placement, inlined CSS | `docs/stage-b.md`, `docs/mapping.md` | 4e94bd4 |
| 6 | Preview tooling: per-visitor cart, `updates[]` handling, search mock, `guest_login` action. Compare tooling: 4 hover/shuffle states, skip link hidden in shots | `tools/local-preview/server.mjs`, `tools/compare/*` | 4e94bd4 |
| 7 | Hero reels garment-fit logic ported (`fitAt`/`compatible`, re-aligning rows after a drag, fit draw in shuffle; inert with today's catalogue) | `theme/assets/hero-reels.js`, `theme/sections/hero-reels.liquid` | da48ba9 |
| 8 | Meta titles and default description localised (`meta.*`; `_html` key so the `&` isn't double-escaped) | `theme/snippets/head-meta.liquid`, locales | da48ba9 |
| 9 | Home title apostrophe changed from ’ to ', matching the reference | locales | a4b4942 |

There were 2 fix rounds. Fix 9 was a one-character copy correction, found and verified by curl during the round-2 re-check.

The S2 cart-page "FAIL" on `updates[]` was overruled. That name is Shopify's documented ordered-array contract (Dawn uses it too), and the bug was in the preview's form parser, which fix 6 corrected.

## Blockers (need the real store)

1. **Store login.** `shopify theme dev` and the theme editor checks (open, add, reorder and remove sections; Liquid errors in the editor) were not run. The fix is `shopify auth login` for `citbkj-yj`, then running docs/stage-b.md §2–§4.
2. **Store data.** No `--backup`, `--dry-run` or `--apply` has run (`tools/store-setup/out/` doesn't exist), so there are no backups or undo logs to check. It's also unconfirmed that the metafields, menus and collections the theme needs are on the store. This needs an Admin token, then a backup, then a dry-run reviewed together before any `--apply`.
3. **Real checkout, customer accounts and live Lighthouse.** These are verified only as markup on the preview. Live-store Lighthouse on the collection and product pages returned Cloudflare 429. All of this needs re-testing on the unpublished store preview once item 1 is done.

The unpublished preview link is "not pushed yet".

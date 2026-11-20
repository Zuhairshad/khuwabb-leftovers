# Stage B runbook (Batch 5 — local machine)

Stage A (web) is finished: every template built, Phase 6 QA signed off at code
level (docs/qa.md). Stage B needs the real store and `shopify theme dev`, so it
runs in Claude Code on Shad's computer, in a checkout of branch `themecode`.

## 0. One-time setup (Shad, in a terminal)

```bash
git fetch origin themecode && git checkout themecode && git pull
npm ci
cd tools/compare && npm install && npx playwright install chromium && cd ../..
npm install -g @shopify/cli@latest
```

Admin API token for the store setup script: Shopify admin → Settings → Apps and sales channels → Develop apps → create an app, give it the scopes listed in `tools/store-setup/README.md`, install it, copy the Admin API access token.

Then edit `CLAUDE.md`: change `**Current stage: A**` to `**Current stage: B**`, and start Claude Code in the repo (`claude`). Ask it: **"start Phase 5 batch 5"**.

## 1. Store data (main session runs, Shad approves)

```bash
SHOPIFY_ADMIN_TOKEN=… node tools/store-setup/setup.mjs --dry-run
```

- Review the diff. Several Admin API shapes were written from memory (`productUpdate(media:)`, `ProductVariantAppendMediaInput`, `MenuItemCreateInput`, `collectionByIdentifier`, `publishedOnPublication`, files lookup) — any GraphQL error here goes back to a Sonnet agent owning `tools/store-setup/**`.
- When the dry run is clean: `… setup.mjs --apply`, then a second `--dry-run` must show no changes (idempotent).
- Check in admin: 118 media with `<Color> | <view>` alts, variant images, collections (`new-in` titled "New arrivals"), 4 menus, 4 redirects, metafield definitions; shop name "Khuwabb".

## 2. Theme preview (main session, background, once)

```bash
shopify theme dev --path theme --store citbkj-yj.myshopify.com
```

Runs at http://127.0.0.1:9292. Agents never start their own.
Reference: `npm run build && npm start` (http://localhost:3000) or `REF_URL=https://khuwabb-leftovers.vercel.app`.

## 3. Compare loop (Phase 5 rules: max 4 agents, disjoint files)

```bash
npm run compare            # all pages, desktop + mobile → tools/compare/out/report.html
npm run compare -- home    # one page
```

For each page with differences (worst sections first):
1. Main session reads the section diffs + key-selector tables in `report.html`.
2. Each mismatch → the **theme-builder task that owns the file** (ownership: docs/mapping.md §7 + the QA-fix batch in docs/qa.md), with the exact mismatch table. Opus does not fix code.
3. Agent fixes, runs `npm run compare -- <page>` until its key-selector table is clean, updates its `docs/parity/*.md`, reports.
4. Main session merges shared-file proposals, runs `shopify theme check --path theme` once per batch, re-runs the full compare.

Expected noise: spring easings are `linear()` approximations (motion frames only; the compare tool disables animations, so static screenshots should match).

## 4. Stage B verification list

Work through "Stage B — must be verified on the real store" at the end of docs/qa.md (cart Section Rendering, real 422 text, product variants, hero pieces from live collections, decorative `alt=""`, intro modes, Lighthouse vs 80 / 90 / 91 / 91, editor checks, axe on real pages, customer accounts, password page, gift card, newsletter tag) and the per-batch checklists in docs/mapping.md §7.

## 5. Done when

- `npm run compare` key-selector tables clean on every page × viewport (or each remaining difference listed with a reason in docs/qa.md);
- every Stage B item ticked in docs/qa.md;
- theme check clean;
- then upload for Shad's review in the real theme editor (below).

## 6. Branch and upload

- The theme code lives **only on branch `themecode`** — never merged to `main`.
- The theme is in the `theme/` folder (the Next.js reference stays at the repo root), so:
  - **CLI (recommended):** `shopify theme push --path theme --store citbkj-yj.myshopify.com --unpublished` → preview, then publish from admin.
  - **Zip:** zip the *contents* of `theme/` (`cd theme && zip -r ../khuwabb-theme.zip . && cd ..`) and upload in Online Store → Themes → Add theme → Upload zip file.
  - Shopify's GitHub integration does not apply as-is (it needs the theme folders at the branch root).
- Run `tools/store-setup` (`--dry-run`, then `--apply`) before or right after the upload — the theme expects the cut-out media, metafields, collections and menus it creates.

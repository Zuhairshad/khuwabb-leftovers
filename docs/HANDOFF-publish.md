# Handoff: finish and publish Khuwabb (Shopify theme + headless)

Paste the prompt below into a Claude Code session that can reach the Shopify store. Everything the
previous (offline) session built is already pushed: `main` at b72d659 or later, `themecode` at e99d531 or later.
That session had no access to the Shopify store, the Behold feed or Vercel, so the items under
"Not verified yet" were never checked against real data.

---

## PROMPT

You are taking over the Khuwabb storefront launch. The owner wants to publish TODAY. Work carefully,
verify against the real store, and ask the owner before anything that changes the live store or the live theme.

### Repos and branches
- GitHub repo `Zuhairshad/khuwabb-leftovers`.
- `main` = the headless Next.js storefront (deployed on Vercel). Pushing to `main` is allowed by the owner.
- `themecode` = the Shopify Online Store 2.0 theme (`theme/` folder) plus tooling (`tools/`). Read
  `CLAUDE.md` on that branch first and follow it: commits authored as
  `Zuhair Shad <123764183+Zuhairshad@users.noreply.github.com>`, no `Co-Authored-By` or `Claude-Session`
  lines on `themecode`, never open a PR to `main` or merge into `main` from theme work. Keep both
  branches in sync by hand (copy the same data files), they do not merge.
- Store: `citbkj-yj.myshopify.com`. **The store is LIVE with the published theme `khuwabb-theme-v2.6`.**
- Brand rule from the owner: no em dashes anywhere (copy, comments, docs). Use commas, colons or full stops.
- Start with: `git fetch --all`, check out `themecode` and `main` in two worktrees, `git pull` both.

### What was already done (do not redo, just verify)
1. Instagram feed section above the footer on both storefronts, reading the Behold feed
   `https://feeds.behold.so/DYiknpiQu0FUjlvSPBMQ`, profile `https://www.instagram.com/khuwabb.co/`.
   Theme: `theme/sections/instagram-feed.liquid`, `assets/instagram-feed.js`. Headless: `components/home/InstagramFeed*.tsx`, `lib/instagram.ts`, `/api/instagram`.
2. Size guide page (all 16 catalog articles, cm and inches, diagrams) and 7-day exchange page.
   Headless: `/size-guide`, `/exchange`. Theme: `templates/page.size-guide.json`, `page.exchange.json`,
   sections `main-size-guide`, `main-exchange`, generated snippet `snippets/size-guide-body.liquid`
   (rebuild with `node tools/size-guide/build.mjs` after editing `data/size-guide.json`; keep that JSON identical on both branches).
   The exchange wording is a DRAFT written without the owner's policy. Ask the owner to confirm it.
3. Footer: Help links go to the two pages, the Khuwabb column is plain text. The theme footer swaps the
   two Help links to the pages automatically once the pages exist, even if the store's `footer-help`
   menu still has the old `mailto:` links.
4. Theme parity with main's 20 Nov commits (Khuwabb photos instead of template images, copy, phone and
   accessibility fixes). See `docs/parity/main-sync-2026-11-20.md`.
5. Scoop intro arch strip fixed (reel offset now CSS `calc()` in `sections/scoop-intro.liquid`).
6. Em dashes removed from both codebases; product text read from Shopify has em dashes swapped for commas.
7. `tools/store-setup` has a new `pages` step (create-only, undoable) and `tools/local-preview` lists all 39 products.

### Not verified yet (your job)
A. **Refresh the product catalog.** The owner says they have made the changes needed to set up the other
   (Shopify-only) products in the store. Run `node scripts/sync-shopify.mjs` on `main` (no token needed) to
   refresh `data/shopify.json`, then copy that file to `themecode`'s `data/shopify.json`. Report how many
   products, their `productType` values, tags, `new-in` tagging, and whether any product is not available
   on the Online Store channel. Commit on both branches. Run `npm run build` on `main` and fix anything that breaks.

B. **Size guide product links.** Four size-guide articles have no "View this piece" link because no matching
   product existed in the 23 Nov sync: Unisex Co-ords Set (shirt and trouser, S to XL), Unisex Co-ords Set Brown,
   Unisex Co-ords Set Green, Seek Unisex Co-ords Set (hoodie and jogger). If matching products now exist, set
   `product` in `data/size-guide.json` on BOTH branches to the headless slug, add a Shopify handle override in
   `tools/size-guide/build.mjs` (`HANDLE` map) only if the handle differs from the headless slug, rerun the build
   script on `themecode`, and check the links on both sites. Do not guess handles.

C. **Categories.** Collections are built from product type (`tools/store-setup/lib/data.mjs` COLLECTIONS and
   `components/home/Flavours.tsx` on main match `p.category` exactly: Gymwear, Trousers, Jackets, Dresses, Co-ord Set).
   Shopify-only products have other types (Leggings, Tops, Tracksuits, Shackets, Sweaters, Activewear,
   Activewear Sets, Playsuits, Bodysuits, Maxi Dress, Puffer Jacket, Sleeveless Puffer Jacket, Women's Jacket,
   Jackets and Hoodies) and therefore sit only under All and New in. Inspect what the owner changed, show the
   owner a proposed mapping (for example Leggings, Activewear and Activewear Sets to Gym wear; Jackets and Hoodies,
   Puffer Jacket, Sleeveless Puffer Jacket and Women's Jacket to Jackets; Maxi Dress to Dresses; Tracksuits to
   Co-ord sets; Tops, Sweaters, Shackets, Playsuits and Bodysuits need a decision or a new category), and only
   after approval apply it consistently: headless category matching, the theme's collection rules, and the
   `category-cards` blocks in `theme/templates/index.json`. Never change collections in the live store without approval.

D. **Create the two Shopify pages.** Required admin scopes: `read_content`, `write_content` (see `tools/store-setup/README.md`).
   Run `node tools/store-setup/setup.mjs --backup --store-check citbkj-yj`, then
   `node tools/store-setup/setup.mjs --dry-run --only pages`, show the owner the plan, and only after approval
   `node tools/store-setup/setup.mjs --apply --store-check citbkj-yj --only pages`. Pages: handle `size-guide`
   ("Size guide", template `page.size-guide`) and `exchange` ("7-day exchange", template `page.exchange`).
   Until they exist the footer keeps its email links and `/pages/...` 404s.

E. **Behold feed.** Fetch `https://feeds.behold.so/DYiknpiQu0FUjlvSPBMQ`. Confirm it returns posts (a plain array or
   `{ posts: [...] }`). If it is empty or the account is not connected in Behold, tell the owner. Check reels
   (`mediaType: VIDEO`) play and that the section shows real posts on both storefronts. The headless side reads it
   server-side (`lib/instagram.ts`, 15 minute cache), the theme reads it in the browser (CORS must allow the store domain).

F. **Preview the theme against the real store, then publish safely.**
   - `shopify theme check --path theme`, then `shopify theme dev` (or `shopify theme push --unpublished` to a NEW theme).
     NEVER overwrite or publish over `khuwabb-theme-v2.6` without the owner's explicit go-ahead. Take a backup/duplicate of the live theme first.
   - Click through on desktop and phone: home (intro animation ends with clean coloured arches and no colour strip
     above the letters, hero reels, sale marquee, category cards, New arrivals, Shop the look, campaign, receipts,
     Instagram strip, footer), `/collections/new-in` (header photo is the Off duty look), `/collections/all`
     (all products, sale prices struck through), a hand-built product and a Shopify-only product (photos, colour and size,
     add to bag, checkout), cart drawer empty state (vinyl jacket picture), `/pages/size-guide` (cm and inches switch,
     jump links, product links), `/pages/exchange`, footer links, search, 404.
   - Run the compare tool described in `docs/stage-b.md` only if time allows.
   - Check the Help footer menu `footer-help`: if its links still point to `mailto:`, the theme overrides the two
     links once the pages exist; the owner can also edit the menu in Online Store > Navigation.
   - Report any em dash, any "Page not found", console error, broken image or layout problem.

G. **Product descriptions.** `tools/store-setup` can write descriptions from `data/products.json` (`--descriptions`).
   Only do this with the owner's approval, after a backup, and tell them which products change. The store may still
   contain em dashes in descriptions and image alt texts; the storefronts hide them in descriptions but alt text is untouched.

H. **Headless deploy.** Confirm the latest `main` deployed on Vercel and these routes return 200:
   `/`, `/shop`, `/new-in`, `/size-guide`, `/exchange`, a product page, `/sitemap.xml`. Optional env vars (all have
   defaults in code): `BEHOLD_FEED_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`. The Shopify product webhook needs
   `SHOPIFY_WEBHOOK_SECRET` and `VERCEL_DEPLOY_HOOK_URL` (see `docs/stock-refresh.md`).

### Rules
- Ask before: applying anything to the live store, publishing a theme, editing collections or menus, writing descriptions,
  force pushing (never), deleting anything.
- Keep `--backup` before every `--apply` (the tool enforces it within 24 hours). Keep the undo log it writes.
- After every change, rerun the relevant check (`npx tsc --noEmit` and `npm run build` on `main`, `shopify theme check --path theme` on `themecode`)
  and report results truthfully, including anything you could not verify.
- When finished, give the owner a short checklist: what is live, what still needs their decision (exchange wording, category mapping,
  product descriptions), and any problem you found.

# Khuwabb store setup

Loads the data the Shopify theme needs into the store, through the Admin GraphQL API (version `2026-10`, same as `lib/shopify-config.mjs`). No dependencies: Node 22+ (built-in `fetch`, `FormData`, `Blob`).

Sources are local: `data/products.json`, `data/shopify.json`, `scripts/build-khuwabb-data.mjs` (colour name → photo folder, parsed from the file, never retyped), `public/products/**`, `public/brand/**`.

**The store is LIVE** (published theme `khuwabb-theme-v2.6`). Default `--apply` is therefore
**additive-only**: it may only add things a customer can't see yet (unpublished collections,
metafield values where none existed, new definitions/menus). Anything that changes existing
data, or is customer-visible on the live theme, needs `--go-live` (and some things also need
`--publish-new-collections`). See "Modes and flags" below.

## Steps

| Step | Default `--apply` (additive only) | With `--go-live` | Admin API calls |
|---|---|---|---|
| `definitions` | Create missing `custom.*` definitions (pinned, storefront `PUBLIC_READ`) | On an **existing** definition: set storefront `PUBLIC_READ` + pin (default mode only reports it). Type mismatch is always an error, never auto-fixed | `metafieldDefinitions`, `metafieldDefinitionCreate`, `metafieldDefinitionUpdate`, `metafieldDefinitionPin` |
| `products` | Write `custom.tint` / `category_line` / `fabric` / `care` / `size_guide` only for keys **currently unset** on the product. An existing *different* value is reported `[skip] differs` and never overwritten — not even with `--go-live` | `productType` changes to match the catalog; `--descriptions` fills `descriptionHtml` only where Shopify's is empty | `products`, `productUpdate` |
| `media` | Reports only (nothing uploaded, nothing linked) | Uploads each colour × view photo and sets variant media to the colour's front image. A variant that already has a **different** media attached is skipped and reported, never detached | `stagedUploadsCreate`, `productUpdate(product, media)`, `productVariantAppendMedia` |
| `collections` | Creates a collection **only if its handle doesn't exist**, **UNPUBLISHED**. If the handle exists: reports only — never adds products, never publishes, never changes rules. Adding products to a manual collection (`new-in`) is additive but only for collections this script created | Also publishes collections this script created | `publications`, `collectionByIdentifier`, `collectionCreate`, `collectionAddProducts` |
| `menus` | Create-only, by handle. If the handle already exists: reports differences, does nothing (`menuUpdate` is never called). Main menu handle is `khuwabb-main` ("Main menu") — the store's own `main-menu` is never read for writing or modified | — (menus has no go-live-only ops) | `menus`, `menuCreate` |
| `redirects` | Reports only | Creates a redirect only if the path has none yet. An existing path with a different target is reported, never updated (`urlRedirectUpdate` is never called) | `urlRedirects`, `urlRedirectCreate` |
| `files` (only with `--files`) | Uploads brand images not already present (optional; the theme has asset fallbacks) | — | `files`, `stagedUploadsCreate`, `fileCreate` |

Class of every operation, as shown in `--plan`: `[additive]`, `[go-live]`, `[publish-new-collections]`, or `[report-only]`.

## Modes and flags

```
--plan                        offline: prints every intended operation + its class, no token needed
--dry-run                      reads the store, prints the diff, writes nothing
--apply                        writes (additive-only unless --go-live is also given)
--backup                       read-only snapshot of the store (see below)
--go-live                      unlocks customer-visible / data-changing ops. Only valid with
                                --apply or --dry-run (to preview what go-live would do)
--publish-new-collections      publishes ONLY collections this script created (never a
                                pre-existing one). Only valid with --apply or --dry-run
--store-check <handle>         REQUIRED for --apply and --backup; optional but still honoured
                                for --dry-run (checked if given, skipped if not). Before any
                                write, queries shop{name myshopifyDomain} and aborts (exit 2,
                                nothing written) unless myshopifyDomain starts with "<handle>."
                                Shop name + domain are printed on every non-plan run. The undo
                                log file and backup directory are always named from the bare
                                store handle (SHOPIFY_STORE with ".myshopify.com" stripped),
                                the same key in every mode, so a --dry-run run and a later
                                --apply run always look at the same undo-log history
--no-backup-check              skip the "recent backup exists" check before --apply (loud
                                warning printed; not recommended)
--only step,...                run only these steps
--descriptions                 (with --go-live) fill empty descriptionHtml
--files                        include the files step
--verbose
```

`--apply` refuses to run unless a backup directory for the same store from the last 24h exists
in `tools/store-setup/out/backups/` (it prints the `--backup` command to make one). Override
with `--no-backup-check`.

## Pre-write guard (denylist)

A fixed list of mutations that change or remove existing/customer-visible data —
`menuUpdate`, `menuDelete`, `urlRedirectUpdate`, `urlRedirectDelete`, `productDelete`,
`collectionDelete`, `productVariantDetachMedia`, `metafieldsDelete`, `fileDelete`,
`productDeleteMedia`, `collectionUpdate`, `publishableUnpublish` — throws if called without an
explicit `allow:true`. `setup.mjs` never passes it; only `undo.mjs` does.

## Backup (`--backup`, read-only)

Writes `tools/store-setup/out/backups/<store>-<ISO timestamp>/`:
`products.json`, `collections.json`, `menus.json`, `redirects.json`,
`metafield-definitions.json` (product + other owner types), `files.json`, `shop.json`,
`manifest.json`. Everything is paginated. Nothing here is a write to Shopify.

`tools/store-setup/out/` is gitignored.

The backup prints a reminder to also, by hand: export the **Products CSV** and **URL redirects
CSV** from the admin, and download the live theme (`khuwabb-theme-v2.6`) as a zip. None of
those three are reachable through the Admin GraphQL API used here.

## Undo log

Every `--apply` write appends JSONL to `tools/store-setup/out/undo-<store>-<timestamp>.jsonl`:
a `pending` line before the mutation and a `done` or `failed` line after, sharing the same
`id` so `undo.mjs` can pair them up. `undo` on a `done` line is either a single
`{mutation, variables}` or, where more than one reversing op is needed, a **list** of them in
the order they'd need undoing (run in reverse by `undo.mjs`). Mappings: created media →
`fileDelete` on those media ids (or `productDeleteMedia(productId, mediaIds)` if that stops
working on a future API version — noted in a comment where it's used); appended variant media
→ `productVariantDetachMedia`; metafields that had no prior value → one `metafieldsDelete` per
key (there's nothing to "restore" — it didn't exist); `productType` changed → a trailing
`productUpdate` restoring the previous value, only present when it actually changed (so a
products entry can be `[metafieldsDelete]`, `[metafieldsDelete, metafieldsDelete, ...]`, or
`[...metafieldsDelete, productUpdate]`); created definition →
`metafieldDefinitionDelete(deleteAllAssociatedMetafields:false)`; created collection →
`collectionDelete`; published → `publishableUnpublish`; `collectionAddProducts` on a
script-created collection → no separate undo (deleting the collection covers it; recorded for
the audit trail anyway); created menu → `menuDelete`; created redirect → `urlRedirectDelete`;
created file → `fileDelete`.

```
node tools/store-setup/undo.mjs --log tools/store-setup/out/undo-citbkj-yj-....jsonl --store-check citbkj-yj
node tools/store-setup/undo.mjs --log <file> --apply --store-check citbkj-yj
```

Dry-run (default) prints each undo, in reverse order (and, within a multi-op entry, that
entry's own ops in reverse too), without writing. `failed` entries are never replayed and are
always printed prominently. A `pending` entry is only flagged as a problem if no later
`done`/`failed` line closes it out (paired by `id`, or by step+op+target for older logs without
one) — that's the sign the process died mid-mutation and it needs a manual check; a normal,
successful run's paired pending/done lines are not flagged.

## Access scopes (custom app)

- `definitions`: `read_products`, `write_products`
- `products`: `read_products`, `write_products`
- `media`: `read_products`, `write_products`
- `collections`: `read_products`, `write_products`, `read_publications`, `write_publications`
- `menus`: `read_online_store_navigation`, `write_online_store_navigation`
- `redirects`: `read_online_store_navigation`, `write_online_store_navigation`
- `files`: `read_files`, `write_files`
- `--backup` additionally benefits from `read_themes` (optional, read-only — to inspect the
  live theme's config/settings by hand; not called by this script)

All at once: `read_products,write_products,read_publications,write_publications,read_online_store_navigation,write_online_store_navigation,read_files,write_files,read_themes`.

## Create the token

**Admin-created ("legacy") custom apps may no longer be creatable on some stores in 2026** —
Shopify has been moving app creation to the Partner/Dev Dashboard. Try the admin route first;
if "Develop apps" isn't offered, use the Dev Dashboard instead:

Admin route (if available):
1. Shopify admin → Settings → Apps and sales channels → Develop apps (enable custom app
   development if asked) → Create an app.
2. Configure Admin API integration → tick the scopes above → Save.
3. Install app → Reveal token once (`shpat_...`) and copy it.

Dev Dashboard route (2026):
1. [dev.shopify.com](https://dev.shopify.com) dashboard → create an app → Admin API scopes →
   set the scopes above → Release.
2. Install the app on the store from the dashboard.
3. Use a client-credentials grant to exchange the app's client id/secret for a short-lived
   Admin API access token (per Shopify's current docs for that flow).
4. Put that token in `SHOPIFY_ADMIN_TOKEN` — same variable either way. It will need
   re-exchanging once it expires.

```
export SHOPIFY_STORE=citbkj-yj.myshopify.com   # default, optional
export SHOPIFY_ADMIN_TOKEN=shpat_xxx           # or a Dev Dashboard client-credentials token
```

## Typical sequences

Live store, now (additive-only — safe before the new theme launches):
```
node tools/store-setup/setup.mjs --backup --store-check citbkj-yj
node tools/store-setup/setup.mjs --dry-run
node tools/store-setup/setup.mjs --apply --store-check citbkj-yj
```

Dev store, for a Stage B preview (everything, including customer-visible ops):
```
node tools/store-setup/setup.mjs --dry-run --go-live --publish-new-collections --descriptions --files
node tools/store-setup/setup.mjs --apply --go-live --publish-new-collections --descriptions --files --store-check <dev-handle>
```

Live store, launch day:
```
node tools/store-setup/setup.mjs --backup --store-check citbkj-yj
node tools/store-setup/setup.mjs --dry-run --go-live
node tools/store-setup/setup.mjs --apply --go-live --store-check citbkj-yj
```

Undo a run:
```
node tools/store-setup/undo.mjs --log tools/store-setup/out/undo-citbkj-yj-<ts>.jsonl --store-check citbkj-yj
node tools/store-setup/undo.mjs --log <file> --apply --store-check citbkj-yj
```

## Commands

```
node tools/store-setup/setup.mjs --plan                 # offline: prints every intended operation, no token needed
node tools/store-setup/setup.mjs --dry-run               # reads the store, prints the diff, writes nothing
node tools/store-setup/setup.mjs --apply --store-check citbkj-yj
node tools/store-setup/setup.mjs --apply --store-check citbkj-yj --only media
node tools/store-setup/setup.mjs --apply --go-live --store-check citbkj-yj --descriptions --files --verbose
```

Run order matters only a little: `definitions` before `products`; `products` before
`collections`; `media` is independent. The default order is correct.

## Safety

- Default `--apply` only adds things a customer can't see yet. `--go-live` unlocks the ops
  that change existing data or are visible on the live theme.
- `--store-check <handle>` aborts before any write if it doesn't match the store.
- `--apply` refuses to run without a backup from the last 24h (override: `--no-backup-check`).
- Denylisted mutations (menu/redirect/collection/file/metafield deletes and updates, variant
  media detach, `publishableUnpublish`) can only be called from `undo.mjs`.
- Idempotent: matches by product handle, media alt, definition key, collection handle, menu
  handle, redirect path, file name. A second `--apply` should report 0 created / 0 updated.
  Existing collections/menus/redirects/definitions that differ from what this script wants are
  **reported**, never auto-changed.
- Exit code is non-zero if any operation failed. GraphQL `userErrors` are printed per
  operation; throttling and 5xx are retried with backoff.
- Media processing is asynchronous: if variant linking runs before images are READY it waits
  up to ~2 minutes, otherwise re-run `--apply --go-live --only media`.
- Gym colours have no `side` photo; that is expected and not reported as a problem.
- Every write is logged to an undo file before AND after it runs (see "Undo log").

## Known API-shape risks (2026-10 shapes written from memory; **untested** against a real store)

- `publications{nodes{id name}}`: if `name` ever fails, the fallback is `catalog{title}` or
  matching by `app{title}` instead — not implemented, since it hasn't been needed yet; if the
  publications query errors, the `collections` step aborts before any write (reads are done
  before writes in every step).
- Menu items: `HTTP` + `url` for links, `FRONTPAGE` for `/`. `--plan`/dry-run output flags this
  shape as untested.
- `resourcePublicationsV2`, `metafieldDefinitions(ownerType:...)` for non-`PRODUCT` owner types,
  and the `files` union fragments in the backup step are likewise unverified against a live
  store.

# Khuwabb store setup

Loads the data the Shopify theme needs into the store, through the Admin GraphQL API (version `2026-10`, same as `lib/shopify-config.mjs`). No dependencies: Node 22+ (built-in `fetch`, `FormData`, `Blob`).

Sources are local: `data/products.json`, `data/shopify.json`, `scripts/build-khuwabb-data.mjs` (colour name → photo folder, parsed from the file, never retyped), `public/products/**`, `public/brand/**`.

**The store is LIVE** (published theme `khuwabb-theme-v2.6`). Default `--apply` is therefore
**additive-only**: it may only add things a customer can't see yet (unpublished collections,
metafield values where none existed, new definitions/menus/pages). Anything that changes existing
data, or is customer-visible on the live theme, needs `--go-live` (and some things also need
`--publish-new-collections`). See "Modes and flags" below.

## Steps

| Step | Default `--apply` (additive only) | With `--go-live` | Admin API calls |
|---|---|---|---|
| `definitions` | Create missing `custom.*` definitions (pinned, storefront `PUBLIC_READ`) | On an **existing** definition: set storefront `PUBLIC_READ` + pin (default mode only reports it). Type mismatch is always an error, never auto-fixed | `metafieldDefinitions`, `metafieldDefinitionCreate`, `metafieldDefinitionUpdate`, `metafieldDefinitionPin` |
| `products` | Write `custom.tint` / `category_line` / `fabric` / `care` / `size_guide` only for keys **currently unset** on the product. An existing *different* value is reported `[skip] differs` and never overwritten — not even with `--go-live`. Also: for products that exist in Shopify but have **no** `data/products.json` entry, write `custom.tint` (unset-only, same rule) from a 5-colour rotation — see "Tints for Shopify-only products" below | `productType` changes to match the catalog; `--descriptions` fills `descriptionHtml` only where Shopify's is empty | `products`, `productUpdate` |
| `media` | Reports only (nothing uploaded, nothing linked) | Uploads each colour × view photo and sets variant media to the colour's front image. A variant that already has a **different** media attached is skipped and reported, never detached | `stagedUploadsCreate`, `productUpdate(product, media)`, `productVariantAppendMedia` |
| `collections` | Creates a collection **only if its handle doesn't exist**, **UNPUBLISHED**. If the handle exists: reports only — never adds products, never publishes, never changes rules/sort order. `new-in` is an **automated** collection (rule `TAG equals "new-in"`, disjunctive, `sortOrder CREATED_DESC`) — see "The `new-in` collection" below. Additively tags every `newIn:true` product `new-in` via `tagsAdd` (independent of whether the collection itself exists yet) | Also publishes collections this script created | `publications`, `collectionByIdentifier`, `collectionCreate`, `tagsAdd` |
| `menus` | Create-only, by handle. If the handle already exists: reports differences, does nothing (`menuUpdate` is never called). Main menu handle is `khuwabb-main` ("Main menu") — the store's own `main-menu` is never read for writing or modified | — (menus has no go-live-only ops) | `menus`, `menuCreate` |
| `pages` | Create-only, by handle: `size-guide` ("Size guide", template suffix `size-guide`) and `exchange` ("7-day exchange", template suffix `exchange`), both **published** with an **empty body** (the theme's `page.size-guide.json` / `page.exchange.json` templates render all content). If the handle already exists: reports a different template suffix/title, does nothing (`pageUpdate` is never called). Runs right after `menus` | — (pages has no go-live-only ops) | `pages`, `pageCreate` |
| `redirects` | Reports only | Creates a redirect only if the path has none yet. An existing path with a different target is reported, never updated (`urlRedirectUpdate` is never called) | `urlRedirects`, `urlRedirectCreate` |
| `files` (only with `--files`) | Uploads brand images not already present (optional; the theme has asset fallbacks) | — | `files`, `stagedUploadsCreate`, `fileCreate` |

Class of every operation, as shown in `--plan`: `[additive]`, `[go-live]`, `[publish-new-collections]`, or `[report-only]`.

## The `new-in` collection

As of 2026-11, `new-in` (handle) / "New arrivals" (title) is defined in `lib/data.mjs`'s
`COLLECTIONS` as an **automated** collection, not manual: rule `TAG equals "new-in"`,
`appliedDisjunctively: true`, `sortOrder: CREATED_DESC` (newest first). Reasoning:

- **Why automated now, not manual-with-adds**: the headless site (`lib/catalog.ts`) already
  treats a product as New In if it's tagged `new-in` (or in `products.json` with `newIn: true`,
  or created in the last 30 days). A tag-ruled smart collection matches that definition exactly
  and stays correct on its own as new products are tagged, instead of needing a script run every
  time a product should join or leave it.
- **How `products.json`'s `newIn: true` products stay in it**: the `collections` step
  additively tags every such product `new-in` via `tagsAdd` (which only *adds* a tag — it never
  touches the product's other tags), every run, regardless of whether this step created the
  collection itself. `tagsAdd` is not denylisted (it's purely additive); its reverse, `tagsRemove`,
  **is** denylisted (added to `lib/api.mjs`'s `DENYLIST`) and is only ever called by `undo.mjs`.
- **`CollectionInput.ruleSet` vs the new `CollectionCreateInput.sources`**: the 2026-10 Admin API
  deprecates `Collection.ruleSet` in favour of `Collection.sources`, and `collectionCreate(input:)`
  in favour of `collectionCreate(collection:)` with a `sources` list (e.g.
  `CollectionSourceInclusionConditionProductTag`). Per Shopify's docs, the legacy `input`/`ruleSet`
  shape is deprecated but **still functional** in 2026-10 ("a `ruleSet` rule maps to an equivalent
  source condition"). This script **keeps the legacy `ruleSet` shape**, the same one already used
  (untouched) for the `jackets`/`trousers`/`dresses`/`gym-wear`/`co-ord-sets` TYPE collections,
  rather than switching to the new `sources` input — the new shape's exact field names could only
  be confirmed via Shopify's public docs (not this repo) and not against a real `collectionCreate`
  call on this store, so it's treated as unverified. If `ruleSet` is ever retired for real,
  migrate `ruleSetFor()` in `lib/steps.mjs` and the `collectionCreate` mutation body in the
  `collections` step to `collection:`/`sources`.
- **Pre-existing `new-in` collection (the common case — it was manual before this change)**: per
  the "never modify an existing collection" rule, the script **never** converts it automatically.
  It is only **reported**: `--dry-run`/`--apply` print exactly what differs (current rule/manual,
  current `sortOrder`, vs. the wanted automated TAG rule + `CREATED_DESC`) so the owner can decide
  whether to delete and let the script recreate it, or edit it by hand in the admin (Collections →
  new-in → edit conditions to "Product tag" "is equal to" "new-in", match type "any", sort "Date
  created (newest first)"). The newIn-product tagging (`tagsAdd`) still runs either way, additively.

## Tints for Shopify-only products

`lib/catalog.ts` gives every Shopify product that has **no** `data/products.json` entry a
pastel `tint` from a fixed 5-colour rotation (`TINTS`, by index `i % 5`), computed over
`Object.entries(data/shopify.json.products)` **after** removing handles covered by
`data/products.json` (via `SHOPIFY_HANDLES`). Those tints only exist in the frontend bundle's
memory, not in Shopify — new in 2026-11, the `products` step also writes them to Shopify as the
`custom.tint` metafield (unset-only, exactly like the other per-product fields in this step), so
they're visible to anything else reading the Admin API and so a value, once set, won't silently
drift if the rotation changes later. Order: `SHOPIFY_ONLY_TINTS` in `lib/data.mjs` is the same 5
`rgb(...)` strings as `lib/catalog.ts`'s `TINTS`, converted to hex (`custom.tint` is a `color`
metafield); kept in sync by hand — if either list changes, change the other. The rotation index
is assigned by walking the **live Admin API product list**, in the order
`shopProducts()`/`products(first:50,after:...)` returns it (no explicit `sortKey`), skipping any
handle that's in `ctx.local.items` (i.e. covered by `products.json`). This mirrors
`scripts/sync-shopify.mjs`, which also queries `products(first:100,after:...)` with no explicit
`sortKey` to build `data/shopify.json`, and `lib/catalog.ts`, which walks that file's insertion
order — so the assumption is that the Admin and Storefront `products` queries use the same
default order (documented as `ID` ascending for both). **This is unverified against the live
store** — if the real two orders ever disagree, the Shopify-only tint rotation here will not
match the one the storefront computes at build time for the same products. Treat this the same
as the other "Known API-shape risks" below: check it against a real `--dry-run` before trusting
`--apply --go-live` for this part, and note that a value already set is never changed even if
the order is later found to disagree (unset-only, never-overwrite).

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
`menuUpdate`, `menuDelete`, `pageUpdate`, `pageDelete`, `urlRedirectUpdate`, `urlRedirectDelete`, `productDelete`,
`collectionDelete`, `productVariantDetachMedia`, `metafieldsDelete`, `fileDelete`,
`productDeleteMedia`, `collectionUpdate`, `publishableUnpublish`, `tagsRemove` — throws if
called without an explicit `allow:true`. `setup.mjs` never passes it; only `undo.mjs` does.
(`tagsAdd` is **not** denylisted — it only adds a tag, never removes one, so it's additive like
everything else `setup.mjs` calls directly.)

## Backup (`--backup`, read-only)

Writes `tools/store-setup/out/backups/<store>-<ISO timestamp>/`:
`products.json`, `collections.json`, `menus.json`, `pages.json`, `redirects.json`,
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
the audit trail anyway); `tagsAdd` (new-in tagging, and any future caller) → `tagsRemove` with
the same tag(s); created menu → `menuDelete`; created page → `pageDelete`; created redirect → `urlRedirectDelete`;
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
- `pages`: `read_content`, `write_content`
- `redirects`: `read_online_store_navigation`, `write_online_store_navigation`
- `files`: `read_files`, `write_files`
- `--backup` additionally benefits from `read_themes` (optional, read-only — to inspect the
  live theme's config/settings by hand; not called by this script)

All at once: `read_products,write_products,read_publications,write_publications,read_online_store_navigation,write_online_store_navigation,read_content,write_content,read_files,write_files,read_themes`.

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
- Denylisted mutations (menu/page/redirect/collection/file/metafield deletes and updates, variant
  media detach, `publishableUnpublish`) can only be called from `undo.mjs`.
- Idempotent: matches by product handle, media alt, definition key, collection handle, menu
  handle, page handle, redirect path, file name. A second `--apply` should report 0 created / 0 updated.
  Existing collections/menus/pages/redirects/definitions that differ from what this script wants are
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
- `new-in` collection's `ruleSet` with `column: TAG` (and `CollectionInput.sortOrder`): the shape
  (`{appliedDisjunctively, rules:[{column:"TAG", relation:"EQUALS", condition:"new-in"}]}`) mirrors
  the already-used `TYPE` rule shape and Shopify's docs confirm `TAG` is a valid `column` and that
  legacy `ruleSet` still works in 2026-10 — but it hasn't been run against this store. See "The
  `new-in` collection" above for why the new `sources`/`CollectionCreateInput` shape was not used
  instead.
- `tagsAdd(id, tags)` / `tagsRemove(id, tags)`: standard, stable Admin API mutations, but also
  unverified against this store (no network calls were made while building this feature).
- Shopify-only `custom.tint` rotation order (`products` step, live `products(first:50,after:...)`
  with no explicit `sortKey`, assumed to default to `ID` ascending, same as the Storefront query
  `scripts/sync-shopify.mjs` uses): unverified — see "Tints for Shopify-only products" above.

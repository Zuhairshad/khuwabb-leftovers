# Khuwabb store setup

Loads the data the Shopify theme needs into the store, through the Admin GraphQL API (version `2026-10`, same as `lib/shopify-config.mjs`). No dependencies: Node 22+ (built-in `fetch`, `FormData`, `Blob`).

Sources are local: `data/products.json`, `data/shopify.json`, `scripts/build-khuwabb-data.mjs` (colour name → photo folder, parsed from the file, never retyped), `public/products/**`, `public/brand/**`.

## Steps

| Step | What it does | Admin API calls |
|---|---|---|
| `definitions` | Product metafield definitions `custom.tint` (color), `category_line` (single line), `fabric` (single line), `care` (multi-line), `size_guide` (rich text); pinned, storefront `PUBLIC_READ` | `metafieldDefinitions`, `metafieldDefinitionCreate`, `metafieldDefinitionUpdate`, `metafieldDefinitionPin` |
| `products` | `productType` = category, metafields `tint` (hex) and `category_line`; `fabric`/`care`/`size_guide` only if present in the catalog; `--descriptions` fills `descriptionHtml` only where Shopify's is empty. Reports products found in one source only | `products`, `productUpdate` |
| `media` | Uploads each colour x view `public/products/<slug>/<folder>/<view>.webp` (full size) plus gym black `piece-top`/`piece-bottom`; alt = `<Colour> \| <view>`; skips alts already on the product; then sets each variant's media to its colour's `front` image | `stagedUploadsCreate` (+ HTTP POST to the staged target), `productUpdate(product, media)`, `productVariantAppendMedia` |
| `collections` | Smart collections by product type (jackets, trousers, dresses, gym-wear, co-ord-sets), manual `new-in` ("New arrivals") with every `newIn` product; publishes all to the Online Store publication | `publications`, `collectionByIdentifier`, `collectionCreate`, `collectionAddProducts`, `publishablePublish` |
| `menus` | `main-menu`, `footer-shop`, `footer-help`, `footer-khuwabb`: created, or items replaced by handle | `menus`, `menuCreate`, `menuUpdate` |
| `redirects` | `/shop`, `/new-in`, and the two old product handles | `urlRedirects`, `urlRedirectCreate`, `urlRedirectUpdate` |
| `files` (only with `--files`) | `collections.jpg`, `wear-the-dream.jpg`, `looks-{daily-edit,off-duty,street-ready,brunch-dates}.jpg` into Files (optional; the theme has asset fallbacks) | `files`, `stagedUploadsCreate`, `fileCreate` |

## Access scopes (custom app)

- `definitions`: `read_products`, `write_products`
- `products`: `read_products`, `write_products`
- `media`: `read_products`, `write_products`
- `collections`: `read_products`, `write_products`, `read_publications`, `write_publications`
- `menus`: `read_online_store_navigation`, `write_online_store_navigation`
- `redirects`: `read_online_store_navigation`, `write_online_store_navigation`
- `files`: `read_files`, `write_files`

All at once: `read_products,write_products,read_publications,write_publications,read_online_store_navigation,write_online_store_navigation,read_files,write_files`.

## Create the token

1. Shopify admin → Settings → Apps and sales channels → Develop apps (enable custom app development if asked) → Create an app.
2. Configure Admin API integration → tick the scopes above → Save.
3. Install app → Reveal token once (`shpat_...`) and copy it. (Apps created in the Dev Dashboard instead give a client id/secret; exchange for an Admin token per Shopify's docs and use the same variable.)

```
export SHOPIFY_STORE=citbkj-yj.myshopify.com   # default, optional
export SHOPIFY_ADMIN_TOKEN=shpat_xxx
```

## Commands

```
node tools/store-setup/setup.mjs --plan                 # offline: prints every intended operation, no token needed
node tools/store-setup/setup.mjs --dry-run              # default; reads the store, prints the diff, writes nothing
node tools/store-setup/setup.mjs --apply                # writes
node tools/store-setup/setup.mjs --apply --only media   # one or more steps: --only definitions,products
node tools/store-setup/setup.mjs --apply --descriptions --files --verbose
```

Run order matters only a little: `definitions` before `products`; `products` before `collections`; `media` is independent. The default order is correct.

## Safety

- Run `--dry-run` first and read the diff.
- It never deletes products, media, collections, files or redirects. Menus listed here have their items replaced (that is the point); other menus are untouched.
- Idempotent: matches by product handle, media alt, definition key, collection handle, menu handle, redirect path, file name. A second `--apply` should report 0 created / 0 updated. Existing collections whose rules differ, and metafield definitions with a different type, are reported as errors, not changed.
- Exit code is non-zero if any operation failed. GraphQL `userErrors` are printed per operation; throttling and 5xx are retried with backoff.
- Media processing is asynchronous: if variant linking runs before images are READY it waits up to ~2 minutes, otherwise re-run `--apply --only media`.
- Gym colours have no `side` photo; that is expected and not reported as a problem.

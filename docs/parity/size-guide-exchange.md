# Parity: Size guide + 7-day exchange pages, footer links

React source (on `main`): `components/size-guide/SizeGuide.tsx` + `.module.css`, `components/info/Exchange.tsx` +
`InfoPage.module.css`, `app/size-guide/page.tsx`, `app/exchange/page.tsx`, `components/Footer.tsx`, `data/size-guide.json`.

| React | Theme |
|---|---|
| `/size-guide` route | Shopify page handle `size-guide`, template `page.size-guide.json` → `sections/main-size-guide.liquid` |
| `/exchange` route | Shopify page handle `exchange`, template `page.exchange.json` → `sections/main-exchange.liquid` |
| `data/size-guide.json` (cm + inches, 16 articles) | Same file copied to `data/size-guide.json`; `node tools/size-guide/build.mjs` generates `snippets/size-guide-body.liquid` (How we measure + every chart). Never hand-edit the snippet. |
| Diagrams `public/size-guide/*.webp` | `assets/size-guide-*.webp` |
| `SizeGuide.module.css` | `assets/section-size-guide.css` (same values/breakpoints; `.page` → `.size-guide`, other classes → `.size-guide__*`) |
| `InfoPage.module.css` | `assets/section-info-page.css` (`.info-page__*`) |
| cm / inches switch (radios + `:has()` on `.page`, no JS) | Same, radios inside `.size-guide` (`#size-guide-unit-cm/-in`) |
| Product links (`getProduct(slug)`) | `all_products['<handle>']` inside the generated snippet (12 handles, under the 20-per-page cap). The two headless slugs that differ from Shopify handles are mapped in `build.mjs`. |
| Exchange copy | Hard-coded in `main-exchange.liquid`; intro + heading are section settings; anything typed in the page editor shows under "More details". **Draft wording** — confirm it matches how exchanges are handled. |
| Footer Help → Size guide / 7-day exchange (were `mailto:`) | `sections/footer.liquid` fallback links use `pages['size-guide'].url` / `pages['exchange'].url` (email until the pages exist); `tools/store-setup` MENUS `footer-help` now points at `/pages/size-guide`, `/pages/exchange` |
| Footer Khuwabb column (Born in Lahore, Delivery across Pakistan, Cash on delivery) now plain text | `sections/footer.liquid`: column 3 renders menu titles / fallback strings without links, whatever the `footer-khuwabb` menu contains |

## Going live in Shopify
1. Create the pages: `node tools/store-setup/setup.mjs --apply --store-check citbkj-yj --only pages` (needs `read_content`/`write_content` scopes; see tools/store-setup/README.md), or in admin: Online Store > Pages > Add page "Size guide" (template `page.size-guide`) and "7-day exchange" (template `page.exchange`).
2. The `footer-help` menu already exists on the store with `mailto:` links; the store-setup `menus` step is create-only and will not change it. Edit it once in admin (Online Store > Navigation > footer-help): Size guide → `/pages/size-guide`, 7-day exchange → `/pages/exchange`.

## Not matched
- Sticky bar offset and scroll margins assume the fixed nav pill (same as React).
- Product links only appear for products that exist in the store (React: only for products in the catalog).

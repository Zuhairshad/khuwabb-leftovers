# Khuwabb storefront

Online store for **Khuwabb** — women's pret and everyday wear, born in Lahore.
Built with Next.js, hand-written React components and CSS Modules, with the
motion and layout of the original design kept intact.

**Live:** https://khuwabb-leftovers.vercel.app

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Catalog: products, prices and photos](#catalog-products-prices-and-photos)
- [Bag and checkout](#bag-and-checkout)
- [Scripts](#scripts)
- [Testing](#testing)
- [Performance](#performance)
- [Deployment](#deployment)
- [Before launch](#before-launch)

---

## Features

- **Home** — "khuwabb" slot-machine intro, outfit reels (jacket over trouser,
  plus the black gym set) with a Shuffle button and an "Add the look"
  chooser, *Find your fit* category cards, a New arrivals hanger ticker,
  the *Wear the dream* campaign with mood looks, *Shop the look* outfits,
  reviews and care labels.
- **Shop** (`/shop`) — every product on arched cards.
- **New In** (`/new-in`) — hanger grid of new arrivals.
- **Product pages** (`/products/<slug>`) — front / side / back photos per
  colour, colour and size selection, description. Product pages open
  directly, without the intro.
- **Bag** — slide-out drawer shared across pages (stored in `localStorage`).
- **One product source** — Home, Shop, New In, product pages and the bag all
  read `data/products.json`; nothing is duplicated.
- Responsive from 390 px phones to wide desktops; respects
  `prefers-reduced-motion`.

## Tech stack

| | |
| --- | --- |
| Framework | [Next.js 15](https://nextjs.org) (App Router), React 19, TypeScript |
| Styling | CSS Modules, global design tokens in `app/globals.css` |
| Motion | [framer-motion](https://motion.dev) (loaded lazily via `LazyMotion`), plus a custom rAF loop for the outfit reels |
| Fonts | Clash Display and Satoshi, self-hosted through `next/font/local` |
| Images | Product cut-outs and brand photos as responsive WebP (`srcset`) |
| Tooling | Playwright (behaviour tests, screenshots, image processing), Lighthouse |
| Hosting | Vercel |

## Getting started

Requires **Node.js 22**.

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build
npm start            # http://localhost:3000
```

Copy `.env.example` to `.env.local` if you need to set checkout variables
(see [Bag and checkout](#bag-and-checkout)).

## Project structure

```
app/
  layout.tsx              Root layout: fonts, nav, footer, intro
  page.tsx                Home
  shop/                   /shop
  new-in/                 /new-in
  products/[slug]/        Product detail pages (static, one per product)
  fonts.ts, globals.css   Brand fonts and design tokens
components/
  Nav, Footer, Bag, ScoopIntro, ScoopReels, GelatoCounter, Ticker, …
  home/                   Home page sections
  shop/, new-in/, product/
lib/
  catalog.ts              The product catalog API (getProduct, canOrder, photo, …)
  bag.ts                  Bag state (localStorage), validated against the catalog
  checkout.ts             Shopify checkout hand-off (disabled by default)
  img.ts                  Responsive image sources from data/image-sizes.json
  intro.ts                Which pages skip the intro
data/
  products.json           Generated catalog (do not edit by hand)
  catalog-overrides.json  Confirmed store details: Shopify variant IDs, stock, fabric, care
  catalog-gaps.md         What each product is still missing
  looks.json, reels.json, gelato-counter.json, receipts.json   Section content
  image-sizes.json        Generated map of responsive image variants
public/
  products/<slug>/<colour>/   Cut-out photos (front/side/back + sized variants)
  brand/                      Campaign, lookbook and shop header photos
  fonts/, icons/, framer/     Fonts, icons, design template assets
scripts/                  Catalog, image, test and benchmark tooling (below)
```

## Catalog: products, prices and photos

The catalog is generated, so edit the sources and rebuild:

1. **Products** — names, categories, prices, sizes, colours and descriptions
   live in `scripts/build-khuwabb-data.mjs`. Prices, colours and sizes come
   from the owner's catalog notes.
2. **Confirmed store details** — Shopify variant IDs, stock, fabric, care and
   size charts go in `data/catalog-overrides.json`:

   ```json
   {
     "ladies-vinyl-jacket": {
       "fabric": "…",
       "care": "…",
       "variants": { "Red / M": { "shopifyId": "1234567890", "available": true } }
     }
   }
   ```

3. **Photos** — supplied studio photos (white background) are turned into
   transparent cut-outs, then into responsive sizes:

   ```bash
   node scripts/cutout-photos.mjs    # source folders → public/products/<slug>/<colour>/<view>.webp
   node scripts/optimize-images.mjs  # sized WebP variants + data/image-sizes.json
   ```

   Source photo folders are kept outside the repo (see `.gitignore`); the
   folder → product mapping is at the top of `scripts/cutout-photos.mjs`.
   Sets photographed as separate pieces (the gym set) are composed side by
   side automatically.

4. **Rebuild** the catalog and section content, then check what's missing:

   ```bash
   npm run catalog:build
   npm run catalog:gaps     # writes data/catalog-gaps.md
   ```

Categories: Trousers, Jackets, Dresses, Co-ord Set and Gymwear. Co-ord and gym
sets are sold as one listing (top and bottom together).

## Bag and checkout

- A size can be added to the bag only when that exact variant has a Shopify
  variant ID **and** is marked available in `data/catalog-overrides.json`.
  Until then product pages show *Not available to order yet*.
- The bag stores only product, colour, size and quantity; name, price and
  photo always come from the catalog, so a stale or edited bag can't carry a
  wrong price or an unavailable item to checkout.
- **Checkout is set up but switched off.** When enabled it hands the bag to
  Shopify's checkout (cart permalink), where Cash on Delivery, shipping,
  totals, stock and order confirmation are handled:

  ```bash
  NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
  NEXT_PUBLIC_CHECKOUT_ENABLED=true
  ```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on :3000 |
| `npm run build` / `npm start` | Production build / server |
| `npm run catalog:build` | Regenerate `data/products.json` and section content |
| `npm run catalog:gaps` | Report missing product details (`data/catalog-gaps.md`) |
| `node scripts/cutout-photos.mjs` | Cut out supplied product photos |
| `node scripts/optimize-images.mjs` | Responsive WebP variants |
| `node scripts/test-store.mjs` | Behaviour tests (below) |
| `node scripts/lighthouse-bench.mjs` | Local Lighthouse benchmark |
| `node scripts/psi-bench.mjs` | PageSpeed Insights against a public URL |
| `node scripts/compare-pages.mjs` | Paired screenshots between two servers |

## Testing

Behaviour tests run in Playwright (Chromium) against any running server:

```bash
node scripts/test-store.mjs --url http://localhost:3000 --vw 1440,390
```

They check that every page loads with its images and no errors, there's no
sideways scrolling or clipped product names, the phone menu, category cards,
outfit shuffle and look chooser work, product colours/views/sizes switch, the
intro is skipped on product pages, and unconfirmed variants can't reach the
bag or checkout.

To exercise the bag end to end, run a dev server with test data that makes
every variant orderable (never honoured in production builds) and pass it as
`--fixture-url`:

```bash
NEXT_DIST_DIR=.next-fixture NEXT_PUBLIC_CATALOG_FIXTURE=orderable npx next dev -p 3300
node scripts/test-store.mjs --fixture-url http://localhost:3300 --vw 1440,390
```

## Performance

- Product cut-outs and photos are served as right-sized WebP through
  `srcset`; only each page's main above-the-fold image gets high priority,
  everything below the fold loads lazily.
- The outfit reels load the photos on screen first and the rest of the ring
  when the browser is idle.
- framer-motion's animation features load after first paint (`LazyMotion`).
- Fonts are preloaded with metric-matched fallbacks; layout is stable from
  the first paint (CLS ≈ 0).

Local Lighthouse 13, production build, median of 3 runs (Performance):

| Page | Mobile | Desktop |
| --- | --- | --- |
| `/` | 80 | 100 |
| `/shop` | 90 | 100 |
| `/new-in` | 91 | 100 |
| `/products/…` | 91 | 100 |

```bash
npm run build && npx next start -p 3400
node scripts/lighthouse-bench.mjs --label after --url http://localhost:3400   # → perf/after/summary.md
```

## Deployment

The repository is connected to Vercel (project `khuwabb-leftovers`). Every
push to `main` deploys to production; other branches get preview
deployments. Build settings are pinned in `vercel.json` (Next.js) and
`package.json` (`"engines": { "node": "22.x" }`).

## Before launch

- Replace the three **draft reviews** in *Seen on you*
  (`scripts/build-khuwabb-content.mjs`, flagged `draft: true`) with genuine
  customer reviews.
- Add Shopify variant IDs and stock to `data/catalog-overrides.json`, then
  enable checkout.
- Add fabric, care and size charts per product (`npm run catalog:gaps`).
- Set real social links in `components/Footer.tsx`.
- A few decorative images still come from the design template
  (`public/framer/`): the intro spin frames, the empty-bag image and the New
  In header photo.

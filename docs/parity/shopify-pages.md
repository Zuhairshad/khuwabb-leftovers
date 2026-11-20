# Parity: Shopify-only pages (search, 404, page, collections list, blog, article)

No React source exists (G18). This documents which design-system value each element borrows. All CSS in `theme/assets/section-shopify-pages.css` (prefix `sp-`); product cards use the rules in `section-main-collection-grid.css`; forms/buttons use `component-form.css` (task 4B).

## Design values

| Element | Value | Borrowed from | Theme location |
|---|---|---|---|
| Frame | `.page-width` max 1280, gutter 32/20; padding-top 140 (104 at <=809.98), bottom 140 (96) | section-main-product.css:11-13, 262-266 | `.page-width.sp` |
| Narrow column | max-width 720 centred | design brief | `.sp__narrow` |
| Title | display 600, 64/64 (52/52 at 810-1199.98, 38/38 at <=809.98), -0.01em, ink | component-section-heading.css:15-44 | `.sp__title`; `data-appear="rise"` |
| Lead | 20px/1.45, -0.01em, ink-62 (19 tablet, 17 phone) | collection-grid.css:152-161 | `.sp__lead` |
| Rich text | 16px/1.6 ink, links underlined; h2/h3/h4 display 600 32/24/20 (26/21 phone); blockquote left rule ink-line; imgs radius 20 | design brief | `.sp-rte` |
| Search pill + button | `.field`/`.field__input` + `.button.button--small` | component-form.css | `.sp-search` (flex, gap 12, max 720) |
| Results count | 16px/1.45 ink-62 | lead scale | `.sp-count` |
| Product grid | 4 cols minmax(220,1fr) gap 48/24; 3 cols minmax(200) at 810-1199.98; 2 cols minmax(140) gap 28/12 at <=809.98 | collection-grid.css:10-18,163-202 | `.sp-grid` |
| Non-product rows | title 20/500, type 14px ink-62, 1px ink-line separators | design brief | `.sp-rows`, `.sp-row*` |
| Collection tile | arch 999/999/28/28, h 360/320/220, padding 56 24 24 (36 12 12 phone), info 16/500 20.8px -0.08px | collection-grid.css:43-103 | `.sp-tile*` (no hover spring, tile is not a product) |
| Blog grid | 3 / 2 / 1 columns, gap 56/24, image 4:3 radius 28 | tokens + arch radius 28 | `.sp-articles`, `.sp-article*` |
| Article | image max 1000 radius 28; meta 14px ink-62; back link 15/500 underlined | design brief | `.sp-post__*` |
| Comments | title display 600 32; comment rows ink-line; form via `.field`, `.button`, `.form-message*` | component-form.css | `.sp-comments*`, `.sp-comment*` |
| Pagination | 44px pills, radius 999, white bg, 1px ink-line, current = ink border + inset ring, gap 8, margin-top 72 (48 phone) | collection-grid.css:112-150,199-201 | `.sp-pagination*` |
| Focus | 2px ink outline, offset 4 | collection-grid.css:106-109 | `.sp-row__link`, `.sp-tile`, `.sp-article__title a` |
| Hover | page pill border -> ink; row/article title underline | collection-grid.css:137-139 | `a.sp-pagination__page:hover`, `.sp-row__link:hover` |
| Motion | titles rise only; reduced motion handled by base.css | brief | `data-appear="rise"` |

## States

| Template | State | Behaviour |
|---|---|---|
| search | no query (`search.performed` false) | title + form only |
| search | results | count line (`search.results`), product cards in grid, then non-product rows (type label = capitalised `object_type`) |
| search | no results | `search.no_results` below form |
| search | page 2+ | pagination nav (Previous / numbered / Next), 24 per page (setting) |
| 404 | default | title, text, arrow-button to `routes.all_products_collection_url` (/collections/all); title/text overridable |
| page | any | h1 page.title + `page.content` in `.sp-rte` |
| list-collections | any | title setting, tiles (collection.image cover, else first product cut-out on its tint), `general.piece` count from `all_products_count`, pagination |
| blog | articles | image (if present), date, title, excerpt, read more; pagination |
| blog | empty | `blog.empty` |
| article | comments disabled | no comments block, component-form.css not loaded |
| article | comments enabled | list (10/page), form (name, email, message), errors, success / moderated message |

## Strings

| String | Source |
|---|---|
| Search / placeholder / button | `search.title`, `search.placeholder`, `search.submit`; label `accessibility.search` (visually hidden) |
| N results for "x" / Nothing found | `search.results`, `search.no_results` |
| Page not found / text / Back to the shop | `404.title`, `404.text`, `404.cta` (settings `title`, `text` override) |
| Pagination | `general.pagination.*` |
| "N pieces" | `general.piece` |
| Collections title | `main-list-collections` setting `title` (default "Collections") |
| Blog/article titles, dates, content | Shopify objects |
| NEW: Read more, Back to blog, By author, empty, comment strings | proposed `blog.*` locale keys (see report) |

## Not matched
- No reference screenshots exist; values are inferred from the design brief.
- Search results other than products have no thumbnails (brief: simple rows).

## Q4 QA fixes (A11, A12, B note)
- main-search: pagination nav uses `general.pagination.label`; results/no-results block renders only when `search.terms` is non-blank (empty `q` shows only the form).
- main-list-collections: tile images are decorative (`alt=""`, cutout-image `decorative: true`) because the collection title is visible in the same link.

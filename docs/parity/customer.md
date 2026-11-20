# Customer account pages + shared form stylesheet (parity)

No React source exists. Each element is built from the design system. "Borrowed" = copied from an existing theme file.

## Files
`assets/component-form.css`, `assets/section-customer.css`, `assets/customer-addresses.js`, `sections/main-{login,register,account,order,addresses,activate-account,reset-password}.liquid`.

## Values
| Element | Value | Source |
|---|---|---|
| Frame `.page-width > .customer` | padding 140 top/bottom; <=809.98: 104 top / 96 bottom | design brief |
| `.customer--form` / `--wide` | max-width 480 / 1000 | brief |
| `.customer__title` | display 600, 64/64, 52/52 (810-1199.98), 38/38 (<=809.98), -0.01em, ink | component-section-heading.css |
| `.customer__lead`, `.order__meta`, `.account__empty` | 20px/1.45, -0.01em, --ink-62 (19 / 17 <=809.98 lead / meta) | brief |
| `.customer__heading` | 24px/600 display, -0.12px | brief |
| `.field`, `.field__label`, `.field__input`, `.field__error`, `.field--checkbox` | per brief; pill border 1px --ink-line, focus border ink + base `:focus-visible` outline, invalid #a8321e | brief; pill look from section-footer.css `.newsletter-form__input` |
| `.button` (+ secondary/small/full) | h56, pad 0 28, 16/600, ink on paper, hover .9, disabled .4 | brief; PDP add button |
| `.form-message` (+ error/success) | 14/1.5, r18, pad 14 18; error #a8321e (cart-drawer `.cart-line__error`); success --pistachio | brief |
| Orders table `.orders` | 15px, header 14/500 --ink-62, 1px --ink-line rows; <=809.98 stacks to white r24 cards with `data-label` | design system |
| `.account__card`, `.address-card` | white, 1px --ink-line, r24, pad 28 | design system |
| `.address-card__badge` | pistachio pill 13/600 | design system |
| `.order__thumb` | 72x90 r16 | design system |
| Money | `snippets/price.liquid` everywhere | pitfall |
| Pagination `.customer__page` | 44px pill, ink when current | main-collection pagination look |
| Reduced motion | form transitions off | CLAUDE.md |

## States
| Page | State | Implementation |
|---|---|---|
| login | errors | `form.errors | default_errors` in `.form-message--error[role=alert]#LoginErrors`; inputs `aria-invalid` + `aria-describedby` |
| login | forgot | link `#recover`; `.customer__recover:target` shows panel and hides `.customer__login` via `:has` (no JS) |
| login | recover success / error | marker `[data-recover-open]` inside the form keeps the panel open after post; success `.form-message--success` |
| login | guest | `shop.checkout.guest_login` -> `guest_login` form, secondary button |
| register | errors | summary + per-field aria-invalid (`form.errors contains 'email'` etc.) |
| account | with orders | table, paginate 20, links to `order.customer_url` |
| account | no orders | empty text + "Start shopping" button |
| order | normal | line items, totals (discount/shipping/tax only when present), addresses |
| order | cancelled | `.form-message--error` with date + reason |
| addresses | list/default | badge when `address == customer.default_address` |
| addresses | add/edit | native `<details>`, JS reopens panels with `[data-has-errors]`, cancel closes |
| addresses | delete | POST form `_method=delete`, `confirm()` via `data-confirm` |
| addresses | country/province | `all_country_option_tags` + `data-provinces`, `data-default`; province field hidden when none |
| activate | submit / decline | `button[name=decline]` |
| reset | errors | summary + aria |

## Strings (locale keys)
All via `customer.*` (existing) plus `bag.start_shopping`, `general.pagination.*`. Missing keys proposed in the report.

## Not matched
- Per-field error text (`.field__error`) is defined in CSS but unused: Shopify exposes a form-level `default_errors` summary; each field links to it with `aria-describedby`.
- No-JS: province select stays hidden; errors on edit forms are not auto-reopened.

## Q4 QA fixes (A19)
Customer forms share component-form.css: `.field__input` / `.button--secondary` borders now `rgba(23, 20, 15, 0.52)` for 3:1 contrast. Deliberate deviation from the React `--ink-line` hairline.

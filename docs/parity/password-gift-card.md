# Password page + gift card (Shopify-only, no React source)

No reference design (G18). Values are borrowed from the design system; "borrowed" cites the theme file.

## Password page: `sections/main-password.liquid` + `assets/section-password.css`

| Element | Value | Source |
|---|---|---|
| Page bg / text | `--paper` / `--ink`, min-height 100dvh | tokens.css |
| Logo | img h 54px, label 10/10, .34em, lowercase, `--ink-62` | borrowed section-header.css:78-94 |
| Title | display 600, 120/84/54px, lh .95, -0.01em, balance | borrowed section-footer.css:34-43,175,191 (tablet 810-1199.98, phone max 809.98) |
| Message | 20/19/17px, lh 1.45, -0.01em, `--ink-62`, max 520 | footer lede scale, section-footer.css:45-54 |
| Newsletter pill | pad 6/6/6/22, radius 999, 1px `--ink-line`, bg white, input h50 16px, button h50 pad 0 24 15px 600 pistachio, hover scale 1.04 (.5s `--ease-out`) | light variant of section-footer.css:223-296 |
| Pill states | idle; bad = border #c0392b + `.form-message--error`; done = pistachio bg, input/button disabled + `.form-message--success` | server-driven (posted_successfully / errors) |
| Arches | five spans, radius `999px 999px 22px 22px`, aspect 1/1.38, pistachio/strawberry/lemon/blueberry/peach, aria-hidden, static | borrowed section-scoop-intro.css:35 |
| Password disclosure | `<details>`, summary 15/500 underlined `--ink-62`; body white card radius 22; opens when `form.errors` | new |
| Password field/button | `.field`, `.field__label`, `.field__input`, `.button.button--full`, errors `.form-message--error` | component-form.css (4B) |
| Focus | pill `:focus-within` 2px ink outline; summary `:focus-visible` | a11y |
| Reduced motion | all transitions off | `prefers-reduced-motion` |

States: default; wrong password (details open, error, field autofocus); newsletter success; newsletter error.

Strings: title -> setting `title` (blank = `general.password_page.opening_soon`); message -> setting `message` (blank = `shop.password_message`); login label/password/submit -> `general.password_page.*`; newsletter aria-label -> `newsletter.label`; placeholder/button/success/error -> settings `newsletter_*` (defaults "Your email", "Notify me", "You’re in. See you in your inbox.", "That email doesn’t look right"); logo label -> setting `logo_label` ("leftover").

Test hook: root `data-section="password"`.

## Gift card: `templates/gift_card.liquid` + `assets/section-gift-card.css`

| Element | Value | Source |
|---|---|---|
| Layout | `{% layout none %}` standalone doc (head-meta/config/fonts, tokens, base, component-form, section-gift-card, content_for_header) | matches Shopify's reference approach; page needs no header/footer and prints cleanly |
| Title | display 600, 64/64 -> 52/52 (<=1199.98) -> 38/38 (<=809.98), -0.01em | brief |
| Card | pistachio, arch-top radius (999px top / 22px bottom), max 520; disabled/expired: white + 1px `--ink-line` | arch motif |
| Balance | display 600 64px (48 phone) via `price` snippet | price.liquid |
| Initial value | shown only when `initial_value != balance` (partially used) | |
| Code pill | monospace 24px (18 phone), .08em, radius 999, `--paper` bg | |
| Copy button | `.button--secondary.button--small`; `navigator.clipboard` with execCommand fallback; label -> "Copied" 2s, aria-live status | |
| QR | `gift_card.qr_identifier` + `vendor/qrcode.js` (deferred), only when active | |
| Wallet | link when `gift_card.pass_url` | |
| Print | `window.print()` button; `@media print` hides actions, white bg, outlined card | |
| Actions | Start shopping `.button` -> `shop.url` | |

States: active; disabled (badge, struck balance, no QR); expired (badge, struck balance, no QR, no expiry line); partially used; copied.

Strings: `gift_card.title/code/copy/copied/expires/disabled/expired/print/shop`; new keys (below) use `default:` fallbacks. "leftover" logo label is a literal (same as header default).

## Not matched / notes
- Newsletter on password page is a light-variant built in the section (footer snippet is dark and footer.js is not loaded in the password layout), so there is no sending/animated "done" state, only server-rendered states.
- Theme check: only `TranslationKeyExists` for the three new gift_card keys until locales are merged.

## Q4 QA fixes (A13, A19)
- Code row is `role="group"` labelled by "Code" (aria-labelledby moved off the plain div).
- QR container `role="img"` with `aria-label` = `gift_card.qr_code` (default "Gift card QR code"). Proposed locale key: `gift_card.qr_code`.
- "Copied" is announced once via the `role="status"` live region; the button label no longer changes (still gets `data-copied` styling).
- component-form.css: `.field__input` and `.button--secondary` borders `rgba(23, 20, 15, 0.45)` (~3.3:1) for WCAG 1.4.11. PDP option borders untouched (parity).

# QA report — Phase 6 (Stage A)

Stage A = Claude Code web: no `shopify theme dev`, no store access, no compare
tool runs. QA here is code-level: scripted parity checks, JS run in headless
Chromium against fixture pages, static accessibility/performance review and
`shopify theme check`. Everything that needs the real store or a browser on the
real theme is listed under **Stage B** — not estimated.

Areas: **A** parity completeness · **B** functions · **C** accessibility · **D** performance + editor.

Severity: **critical** = page broken / wrong content / blocks a task · **major** = clearly visible difference or significant barrier · **minor** = small or cosmetic.

---

## Summary

| Area | Critical | Major | Minor | Status |
|---|---|---|---|---|
| A parity | 0 | 0 | 4 (1 not applicable) | ✅ reported |
| B functions | – | – | – | pending |
| C accessibility | – | – | – | pending |
| D performance + editor | – | – | – | pending |

---

## A — Parity completeness

Method: postcss parse of all 22 reference CSS files (~1,500 declarations) matched against the mapped theme CSS with normalised values and media context; every JSX string/attribute + rendered data JSON searched in the theme; all `data-*` hooks from audit §7.20/§5.8a, test-store.mjs, compare config and tools/compare/pages.json; breakpoints; templates/section groups. Scripts in the session scratchpad (`qa-a/`).

Result: no missing or wrong values. 22 flagged declarations are all accounted for (19 dead code in the reference, documented as skipped; renamed/split with equal values; token indirection). 14/14 test hooks present; every compare `data-section` present. Breakpoints identical per component (809.98 / 810–1199.98 / 1199.98 / 639.98 / min 810; JS thresholds 640, 700, PHONE, BELOW_DESKTOP). All routes have templates; all section/block types and settings in templates resolve; home order matches `app/page.tsx`.

| # | Sev | Where | Expected vs actual | Decision |
|---|---|---|---|---|
| A1 | minor | Footer legal, all | Reference hard-codes "© 2026 Khuwabb. Born in Lahore."; theme prints the current year | **Keep** — identical in 2026, correct afterwards |
| A2 | minor | `<title>` on /collections/new-in | Reference literal "New arrivals · Khuwabb"; theme uses `page_title · shop.name` | **No change** — `tools/store-setup` titles the collection "New arrivals"; verify shop name = "Khuwabb" in Stage B |
| A3 | minor | Product `<title>` | Reference catalog name; theme Shopify title (G24) | **Data** — store titles are canonical (approved G24) |
| A4 | minor | Footer payment icons | Not ported (hidden in reference too, G16) | **Keep** |

---

## B — Functions

_pending_

## C — Accessibility

_pending_

## D — Performance + editor

_pending_

---

## Stage B — must be verified on the real store

_Merged from all areas once reported._

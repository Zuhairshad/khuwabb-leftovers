# Parity: care-labels

Source: `components/home/CareLabels.tsx`, `CareLabels.module.css`.
Theme: `sections/care-labels.liquid`, `snippets/care-icon.liquid`, `assets/section-care-labels.css`. No JS of its own (appear.js drives `data-shown`).

## CSS rules (CareLabels.module.css -> section-care-labels.css)

| Source | Theme selector |
|---|---|
| :1-9 `.section` | `.care-labels` |
| :11-18 `.label` (flex none, width min-content, padding 6, radius 6, bg ink) | `.care-labels__label` (+ `rotate: var(--tilt)`) |
| :20-29 `.stitch` | `.care-labels__stitch` |
| :31-39 `.stitch::after` dashed `1.5px #f7f3ec73`, inset 0, pointer-events none | `.care-labels__stitch::after` |
| :41-44 `.stitch svg` | `.care-labels__stitch svg` |
| :46-53 `.stitch p` (16/20.8, 500, -.08px, white-space pre) | `.care-labels__stitch p` |
| :55-64 phone <=809.98: section gap 12, padding 24 20 96; label max-width 100% | same media query |

## Behaviour

| Source | Theme |
|---|---|
| `data-section="care-labels"` | section root |
| `LABELS` (4 items) | `label` blocks (max 6), presets with the 4 defaults; `text`, `icon` select leaf/needle/returns/truck |
| Icon paths, 22px, viewBox 24, stroke currentColor 1.5 round | `snippets/care-icon.liquid` verbatim `d`/`transform`; stroke props on parent `<g>`; `aria-hidden` |
| tilt -2/+2 by index | Liquid `modulo: 2` -> `--tilt` -> `rotate` |
| enter rotate -8 (even) / +8 (odd) | `--enter-rotate` |
| delays .10/.22/.34/.46 | `--delay` = .10 + .12 x index |
| hidden `{opacity 0, y 30, rotate, scale 1}` -> shown `{1, 0, tilt, 1}`, spring bounce .3 / 1.2s | `.js .care-labels__label[data-appear="label"]` / `[data-shown]`, `1.2s var(--spring-label) var(--delay)` on opacity, translate, rotate, scale |
| `whileInView`, amount .3, replay | `data-appear-amount="0.3"` + appear.js |
| hover `{rotate 0, scale 1.04}`, spring bounce .4 / .6s | `:is(:hover, :focus-within)` rule, `.6s var(--spring-label-hover)`, no delay; leaving hover reverts via shown transition (delay included), like framer |
| Strings | block `text` (defaults verbatim) |

## States

| State | Handling |
|---|---|
| Before reveal | `.js` + no reduced motion: opacity 0, translate 30px, rotate +-8 |
| Revealed / replay | `data-shown` toggled both ways |
| Hover / focus-within | rotate 0, scale 1.04 |
| Phone | media query |
| Reduced motion | motion rules inside `no-preference`: static at tilt, no hover motion |
| No JS | static at tilt |

## Not matched

- CSS `linear()` spring approximation of framer springs.
- Labels are non-interactive, so `:focus-within` never triggers in practice (kept per task).
- Stroke attributes on `<g>` rather than every path (same render).

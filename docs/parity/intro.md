# Parity: scoop intro (khuwabb slot-machine overlay)

Theme files: `theme/sections/scoop-intro.liquid` (markup + settings + timing maths), `theme/assets/section-scoop-intro.css`, `theme/assets/scoop-intro.js` (`<scoop-intro>`), `theme/assets/intro-1..6.webp`.
Source: `components/ScoopIntro.tsx` (TSX), `components/ScoopIntro.module.css` (MOD), `app/globals.css` (GC), `data/scoop-intro.json`, `lib/intro.ts`.

## Image mapping
`IMAGES` (20 entries) cycles six PNGs in order, rendered as `-240w.webp` (lib/img `atLeast(src,0)` -> only variant). Entry j = `intro-(j % 6 + 1).webp`; Liquid: `((i*3 + a*5) % 20) % 6 + 1`.

| intro-N | source file (public/framer/images/) |
|---|---|
| 1 | xdPzBTPOlyAwNMuYx9p4OZoe2YM.1eykv53-240w.webp |
| 2 | jTlpl4onUFoGlIAl8DHltxXSis.18d31i1-240w.webp |
| 3 | h6PK8hijaIEwUrkQJH8vvJvX8PI.1ovqnh1-240w.webp |
| 4 | Kl2g23gPjLqU4TuKqBqDJRdIA.1tcgt53-240w.webp |
| 5 | i4uDOrvJkX7RPna7euwLHugskCU.0ymizea-240w.webp |
| 6 | PWGSTm2XSsl8QaDVbb9zS1Zh8.1s7m11d-240w.webp |

## CSS rules
| Source | Theme |
|---|---|
| MOD:1-11 `.root` (fixed, inset 0, z 10000, overflow hidden, bg paper, pointer-events none, flex centre) | `.scoop-intro` in section-scoop-intro.css (+ `display:none` by default, `display:flex` under `html[data-intro-playing]`) |
| MOD:13-17 `.row` (gap `min(1.4vw,16px)`, centre) | `.scoop-intro__row` |
| MOD:19-26 `.arch` (width `--arch-w`, height x1.38, radius `999px 999px 22px 22px`, overflow hidden, opacity 0) | `.scoop-intro__arch` |
| MOD:28-36 `.reel` | `.scoop-intro__reel` |
| MOD:38-44 `.cell` | `.scoop-intro__cell` |
| MOD:48-52 `.frame` (78%, `center/contain no-repeat`, CSS background so never LCP) | `.scoop-intro__frame`; image set inline `background-image:url(asset)` |
| MOD:54-62 `.letter` (Clash 600, arch-w x1.05, lh 1, ls -.04em, ink, translateY 4%) | `.scoop-intro__letter` (font token `--font-display`, `--ink`) |
| GC:137-145 reduced-motion block (`[data-intro]` siOut .8s ease !important; `[data-intro] *` no animation/filter) | same block, section-scoop-intro.css end; root keeps `data-intro` |

## Keyframes (all in section-scoop-intro.css, same names)
| Source | Theme |
|---|---|
| GC:72-81 siIn | `@keyframes siIn` (y 40 -> 0, opacity 0 -> 1) |
| GC:83-102 siSpin (blur 0/7@12/3@70/0@86; y overshoot@86, end@100) | `@keyframes siSpin` identical |
| GC:104-108 siUp (-115vh) / GC:110-114 siDown (115vh) | identical |
| GC:116-129 siOut | identical |
| GC:131-135 siBg | identical |

## Constants (TSX:12-22) and computed values (Liquid)
SPIN_START .35; spinDuration(i)=1.35+.2i; SETTLED = .35 + spinDuration(N-1) + .55 (N=7: 3.45); TOTAL=(SETTLED+1.15)*SPEED (4.6 at speed 1); `s(x)=(x*SPEED).toFixed(3)s`, SPEED = 1/clamp(speed,.5,2); SPINS clamp 3..12 round; BRAND = first 8 chars. All in the top `liquid` block of scoop-intro.liquid (round: 3 instead of toFixed(3); trailing zeros dropped, numerically equal).

Defaults (speed 1, spins 7, N=7), verified by rendering the section with liquidjs in a throwaway script against the TSX formulas (also spins 4/speed 1.5, spins 12/speed .5: 0 mismatches over every letter, cell colour, image and number):

| Value | i=0 | i=6 |
|---|---|---|
| exit anim (TSX:74) | siUp 1s @ 3.45s | siUp 1s @ 3.81s (odd i: siDown) |
| arch siIn (TSX:76) | .7s @ .05s | .7s @ .35s |
| reel siSpin (TSX:79) | 1.35s @ .35s | 2.55s @ .35s |
| arch colour COLORS[i%5] | #d5e5be | #f6c9cf |
| reel height | 700% | 700% |
| cell a=0 (colour, image) | #f6c9cf, intro-1 (j=0) | #f5e7a6, intro-1 (j=18) |
| cells a=0..5 images | 1,6,5,4,1,6 | 1,4,3,2,1,4 |
| cells a=0..5 colour idx | 1,2,3,4,0,1 | 2,3,4,0,1,2 |

Cell colours/images for all 6 image cells + letter cell per letter verified by script; root: `siBg .9s @ 3.6s`, `siOut .01s @ 4.55s`, `--spin-end -85.7143%`, `--spin-overshoot -86.7143%`, `--arch-w min(12.57vw,250px,43.48vh)`, `data-total=4.6`; JS removes at 4.68s (reduced: 0.88s).

## Settings (mapping.md 2.3)
brand (default khuwabb, first 8 chars), color_1..5, spins 3-12 (7), speed .5-2 step .1 (1), lock_scroll (true); `enabled_on.groups: custom.overlay`. On/off and play_on are global (settings.intro_enabled / intro_play_on) and decided in head-config.

## States
| State | Behaviour |
|---|---|
| Playing (html[data-intro-playing]) | overlay `display:flex`, animations run, JS removes node and the attribute at TOTAL+.08s |
| Scroll lock | CSS `html[data-intro-playing]:has(.scoop-intro[data-lock]) {overflow:hidden}` inside `prefers-reduced-motion: no-preference`; released when the attribute is removed |
| Reduced motion | overlay fades (siOut .8s), descendants no animation/filter, no lock, removed at .88s |
| Not playing (product page, intro off, home_only elsewhere, once_per_session repeat, theme editor) | attribute absent: CSS hides it and JS removes the node immediately |
| Theme editor | head-config never sets the attribute; `disconnectedCallback` clears the timer so section reloads are safe |
| Server render | whole overlay is in the HTML, `display:flex` from first paint when the attribute exists (set in head before body) |

## Not matched
- React `setTimeout` restores `root.style.overflow`; the theme uses a CSS rule tied to the attribute (equivalent; also cleans up if JS fails to load, only the overlay's own animation hides it then, and scroll stays locked; acceptable risk, JS is deferred but tiny).
- Letter is HTML-escaped (`| escape`); source renders text nodes (same result).
- Source splits by code points (`Array.from`); Liquid `slice` is by characters (identical for BMP text; astral emoji in brand not supported).
- The overlay's `will-change` etc. copied; no differences in reduced motion beyond the source's own rules.
- `font-weight:600` kept; only 600 Clash face exists (assets/clash-display-600.woff2).

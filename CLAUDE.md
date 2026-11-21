# Khuwabb: Next.js storefront → Shopify theme

The Next.js storefront in this repo (`app/`, `components/`, `lib/`, `data/`, `public/`)
is the reference. The goal is a Shopify Online Store 2.0 theme that matches it
visually and behaviourally, built on branch `themecode`.

**Branch rule (owner decision):** all work stays on `themecode` only. Never open a PR to `main` and never merge into `main`. The theme is uploaded to the store from `themecode` (`theme/` folder; see docs/stage-b.md).

**Commit rule (owner decision):** every commit is authored and committed as `Zuhair Shad <123764183+Zuhairshad@users.noreply.github.com>` (set `git config user.name/user.email` in each new checkout), with no `Co-Authored-By: Claude` or `Claude-Session` lines in the message.

- Store: `citbkj-yj.myshopify.com` (see `lib/shopify-config.mjs`).
- Reference site: the Next.js app (local `npm run dev` on :3000, or https://khuwabb-leftovers.vercel.app).
- Planning docs: `docs/audit.md` (what the Next.js app does) and `docs/mapping.md` (how it maps to the theme).
- Don't change the Next.js app's source while building the theme; it is the reference.

## Model & agent policy (strict)
- Main session = Opus 5.5. It ONLY does: planning, architecture decisions, writing/approving docs/audit.md and docs/mapping.md, owning shared files, splitting work into tasks, reviewing agent reports, merging proposed shared-file changes, and final sign-off.
- Everything else runs on Sonnet 5.5 subagents (repo-auditor, theme-builder, qa-tester, or general-purpose with model: sonnet): reading code, building sections/snippets/JS, building tools, running compares, fixing diffs, testing.
- Opus does not write section/snippet code itself. If an agent's output is wrong, Opus sends it back with specific feedback instead of fixing it directly.
- Run independent agents in parallel. Give each agent a disjoint list of files it owns. Two agents never own the same file.
- Shared files are owned by Opus only: layout/theme.liquid, config/settings_schema.json, config/settings_data.json, locales/*.json, snippets/head-*.liquid (incl. head-styles.liquid = the global tokens + base CSS, inlined), templates/**/*.json, sections/*-group.json (all under `theme/`).
- Max 4 agents in parallel at once (the compare tool runs browsers).
- After each batch: Opus reads every report, merges shared-file changes, runs `shopify theme check` once, and decides the next batch.

## Environment stages
Stage A (Claude Code web, current):
- No `shopify theme dev`, no store login, no `shopify theme push`, no running the compare tool. Don't try them.
- Verification = code parity, not screenshots: every style, class, breakpoint, state and piece of copy in the React source must have a matching place in the theme. Agents record this in docs/parity/<section>.md.
- Try `npx -y @shopify/cli@latest theme check`. If it can't install or run, note it in the report and continue.

Stage B (local terminal) — runbook: docs/stage-b.md
- `shopify theme dev` runs once, started by the main session, in the background. Agents never start their own.
- The compare tool is the source of truth for visual match.

**Current stage: B**

## Known pitfalls
- The React source uses **CSS Modules + `app/globals.css`, not Tailwind**. Parity tables map each CSS-module rule (file:line) to its theme selector; class names are scoped hashes, so theme classes follow the naming in docs/mapping.md.
- Copy exact values from docs/audit.md / the source; never round (e.g. `809.98px`, `20.8px`, `-0.08px`, `.95` line-height).
- Satoshi is shipped at 400 and 500 only. Rules that ask for 600 render as 500 in the reference; keep `font-weight: 600` in CSS but don't add a 600 face.
- `all_products[...]` is capped at 20 handles per page: use `product`/`collection` settings in sections and blocks, never `all_products`, for home-page content.
- Option names are exactly `Color` and `Size`; look options up by name, not position.
- Shopify money is in cents; always format through the shared money snippet/JS helper (`Rs.` + grouped, no decimals), never raw `| money`.
- `position: sticky` (Looks cards, PDP info) breaks if any ancestor has `overflow: hidden`; use `overflow: clip` only where the source does.
- Keep every `data-*` test hook listed in docs/audit.md §7 item 20 and §5.8a on the equivalent theme element.
- Respect `prefers-reduced-motion` in every animation you port (the source misses several; the theme should not).
- Each JS component is a custom element in its own `assets/<name>.js`, loaded with `defer`; no frameworks, no build step.

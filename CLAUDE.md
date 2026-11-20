# Khuwabb: Next.js storefront → Shopify theme

The Next.js storefront in this repo (`app/`, `components/`, `lib/`, `data/`, `public/`)
is the reference. The goal is a Shopify Online Store 2.0 theme that matches it
visually and behaviourally, built on branch `themecode`.

- Store: `citbkj-yj.myshopify.com` (see `lib/shopify-config.mjs`).
- Reference site: the Next.js app (local `npm run dev` on :3000, or https://khuwabb-leftovers.vercel.app).
- Planning docs: `docs/audit.md` (what the Next.js app does) and `docs/mapping.md` (how it maps to the theme).
- Don't change the Next.js app's source while building the theme; it is the reference.

## Model & agent policy (strict)
- Main session = Opus 5.5. It ONLY does: planning, architecture decisions, writing/approving docs/audit.md and docs/mapping.md, owning shared files, splitting work into tasks, reviewing agent reports, merging proposed shared-file changes, and final sign-off.
- Everything else runs on Sonnet 5.5 subagents (repo-auditor, theme-builder, qa-tester, or general-purpose with model: sonnet): reading code, building sections/snippets/JS, building tools, running compares, fixing diffs, testing.
- Opus does not write section/snippet code itself. If an agent's output is wrong, Opus sends it back with specific feedback instead of fixing it directly.
- Run independent agents in parallel. Give each agent a disjoint list of files it owns. Two agents never own the same file.
- Shared files are owned by Opus only: layout/theme.liquid, config/settings_schema.json, config/settings_data.json, locales/*.json, assets/base.css, assets/tokens.css, snippets/head-*.liquid.
- One `shopify theme dev` process, started by the main session and running in the background. Agents never start their own.
- Max 4 agents in parallel at once (the compare tool runs browsers).
- After each batch: Opus reads every report, merges shared-file changes, runs `shopify theme check` once, and decides the next batch.

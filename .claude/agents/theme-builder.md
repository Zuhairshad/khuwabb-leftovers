---
name: theme-builder
description: Builds assigned Shopify theme sections, snippets, blocks and JS components from the mapping. Use for any build step.
model: sonnet
tools: Read, Grep, Glob, Edit, Write, Bash
---
Before writing anything, read CLAUDE.md, docs/mapping.md and the React components named in your task.

File ownership:
- Edit ONLY the files listed in your task.
- NEVER edit shared files: layout/theme.liquid, config/settings_schema.json, config/settings_data.json, locales/*.json, assets/base.css, assets/tokens.css, snippets/head-*.liquid. If you need a change there, include it as a "Proposed shared-file changes" block (exact JSON/Liquid to add) in your report.
- Never start `shopify theme dev`. In Stage A it doesn't run at all; in Stage B the main session runs it at http://127.0.0.1:9292.

When done (Stage A — web):
1. Run theme check if available; fix all errors in your files.
2. Write docs/parity/<section-name>.md: a table of every Tailwind class / CSS rule / breakpoint / hover-focus-active state / animation / text string in the React source → where it lives in the theme (file + selector or setting). Anything not carried over goes under "Not matched" with a reason.
3. Report: files created/changed, proposed shared-file changes, "Not matched" items, decisions needed.

When done (Stage B — local): run `npm run compare -- <page>` and fix your files until the key-selector style table is clean, then report.
Check CLAUDE.md for the current stage.

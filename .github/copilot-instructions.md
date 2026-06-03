---
applyTo: "**"
---

# Copilot instructions — produce-gallery

The canonical conventions for this repo live in [AGENTS.md](../AGENTS.md). Read
it before making changes — it is the operator's manual and records the *why*
behind decisions. This file only highlights the must-not-forget rules.

## Project at a glance

React + TypeScript + Vite + Tailwind site browsing produce across three data
tiers: **curated** (`src/data/curated.ts`), **snapshot**
(`src/data/wikidata-snapshot.json`), and **live** Wikidata SPARQL
(`src/services/wikidata.ts`). Deployed to GitHub Pages under `/produce-gallery/`.

## Critical rules

- **Respect the single-source-of-truth files.** Category QIDs live only in
  `src/data/category-qids.json`; category emoji/colour only in
  `src/data/category-defaults.ts`. Never hardcode these elsewhere. Adding a
  category means updating `types.ts`, `category-qids.json`,
  `category-defaults.ts`, `DetailView.tsx`, `FilterBar.tsx`, and `wikidata.ts`.
- **Bump the Wikidata cache key** (`CACHE_KEY = "produce-gallery:wikidata:vN"`
  in `src/services/wikidata.ts`) whenever the cached value's shape or contents
  change, or users hit stale cache.
- **Verify before committing:** `npm run build && npm run test:e2e` (also
  `npm run lint`). The smoke suite is fast and catches real regressions.
- **Strict TypeScript** — keep it clean (`noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch` are on).
- **Conventional commits**, lowercase after the colon (`feat`, `fix`, `revert`,
  `chore`, `docs`, `refactor`, `style`, `test`). The body explains the *why* and
  the tradeoff, not the what.
- **Keep `PROGRESS.md` current** — update its relevant section in the same
  commit as the work.
- **Don't relitigate documented tradeoffs** (subtle dark-mode contrast, the
  ~16px modal-open reflow, `ring-ink/5` static rings). See AGENTS.md.

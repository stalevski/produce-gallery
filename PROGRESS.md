# PROGRESS

A lightweight, hand-maintained status board so this project can be picked up on
any device (or by anyone) without losing context. Commit it like code - it is
the answer to "where was I?" and "what next?".

The README is the pitch, [AGENTS.md](AGENTS.md) is the operator's manual, and
this file is the live state. Update the relevant section in the same commit as
the work it describes, and date your entries (`YYYY-MM-DD`).

---

## Current focus

_What is actively being worked on right now. Keep this short - move finished
items to the decision log, move not-yet-started ideas to the backlog._

- **Agent-readiness pass** (2026-11-21) - `npm run verify` as the single gate,
  `.mcp.json` + devcontainer, and one in-repo skill for snapshot refreshes.
  Remaining: rerun the assertion guardrail from CI once `checkout` fetches
  `origin/main`.

---

## Backlog / Roadmap

_Future ideas, roughly ordered by appetite. Pull an item up to "Current focus"
when you start it._

- **Wikidata maintenance runbook** - ~~step-by-step for upstream QID drift~~ Done
  2026-11-21: lives in `.agents/skills/refresh-wikidata-snapshot/SKILL.md` (also
  symlinked as `.claude/skills`), so an agent picks it up without being told.
- **Tailwind 4 migration** - deliberately deferred during the 2026-06-11 LTS
  upgrade pass (breaking config rewrite: CSS-first `@theme`, new PostCSS
  plugin). Everything else is current.
- **Unit tests (Vitest)** - pure logic worth covering: URL state parse/encode in
  `src/App.tsx`, filter/sort logic, the generic-label filter in
  `src/services/wikidata.ts`. Would pair with the existing Playwright smoke suite.
- **Pre-commit hooks (Husky + lint-staged)** - run lint/format on staged files
  once ESLint/Prettier have settled in.
- **Accessibility pass** - audit focus order, ARIA on the modal, and colour
  contrast in both themes.

---

## Known issues & limitations

_Accepted tradeoffs and rough edges. Many of these are deliberate - see
[AGENTS.md](AGENTS.md) for the rationale before "fixing" them._

- **Modal-open layout shift (~16px).** Opening the detail modal sets
  `body { overflow: hidden }`, removing the scrollbar and reflowing the page
  wider. `scrollbar-gutter: stable` was tried and reverted because it hurt the
  dark-mode page colour. Deliberate; don't relitigate without checking first.
- **Chromium-only test coverage.** ~~Firefox/Safari are untested~~ Fixed
  2026-06-11: Playwright now runs chromium + firefox + webkit projects.
- **No linter historically** - being addressed via ESLint/Prettier; expect an
  initial cleanup pass as rules bed in.
- **Live source depends on public Wikidata SPARQL.** Endpoint outages or
  ontology changes can break the Live tier; the Snapshot tier is the safety net
  and `health-check.yml` warns weekly when upstream drifts.
- **Dark-mode surface/ring contrast is intentionally subtle.** Bumping it has
  been tried and reverted.

---

## Decision log / changelog

_Append-only. Newest first. Record the **why** and the tradeoff, not just the
what - the git history already has the what. Seeded from recent commits._

- **2026-11-21** - Made the repo agent-ready, mostly by deleting duplication.
  `npm run verify` (lint -> format:check -> typecheck -> assertion guardrail ->
  build -> e2e) is now the one command that means "done"; it is `tsc -b` and not
  `tsc -b --noEmit` because the composite `tsconfig.node.json` reference rejects
  `--noEmit` (TS6310) and the emitted `vite.config.js`/`.d.ts` are gitignored
  anyway. `.github/copilot-instructions.md` was 38 lines restating AGENTS.md and
  had already drifted from it, so it is now a 4-line pointer - one source, not
  two. `scripts/check-assertions.sh` fails on `skip`/`fixme`/`toBeTruthy`/
  `waitForTimeout`/`force: true` **added** to a spec versus `origin/main`, which
  grandfathers the deliberate WebKit `force: true` fallback while making the
  next one a reviewable act; it stays local-only for now because a shallow CI
  checkout has no `origin/main` to diff against. No unit-test tier was added -
  that remains a separate decision (see backlog).

- **2026-11-18** - Closed the `minimatch` advisory that was accepted on
  2026-11-12; that note is now obsolete. typescript-eslint 8.73.0 / eslint 10.15
  admit minimatch 11, so `npm audit fix` took the tree to 11.0.9 - except for
  the copy nested under `tailwindcss -> sucrase -> glob@10.5.0`, because glob 10
  requires `minimatch ^9` and Tailwind 3 pins `glob ^10.3.10`. An `overrides`
  entry (`"minimatch": "^11.0.9"`) closes it; minimatch 11 still ships CommonJS
  so glob 10 resolves it, confirmed by a clean build and 21/21 smoke tests. Drop
  the override once Tailwind 4 lands (it uses glob 11+, already on the backlog).
  What remains is `glob` itself (moderate, fixed only in glob 14 - same Tailwind 4
  blocker) and `picomatch` (high, GHSA-fc5q-39xc-vjpf, **no patched version**
  published), both build-time only.

- **2026-11-18** - `.gitattributes` now says `* text=auto eol=lf`. With plain
  `text=auto` plus `core.autocrlf=true` (this clone), files check out as CRLF
  while `.editorconfig` and Prettier both mandate LF - so the `format:check`
  step added in #49 failed on every file for Windows contributors even though CI
  was green. Existing clones need a one-off `git add --renormalize .` (or a fresh
  checkout) to pick up LF in the working tree.

- **2026-11-12** - Cleared the dependency advisories with `npm audit fix`
  (lockfile only, no manifest change): vite 8.0.16 -> 8.3.8 (five advisories,
  one high - the `launch-editor` command-injection set), postcss-selector-parser
  6.1.2 -> 6.1.6, brace-expansion 5.0.9 -> 5.0.13, plus in-range point bumps of
  its own transitive tree. 14 advisories -> 10. **What remains is one advisory**
  (minimatch `>= 7.0.0 < 11.0.1`): the only fix is minimatch 11, and both
  eslint 10 and typescript-eslint 8.72.2 pin `^10`, so forcing it with an
  `overrides` entry would break linting. It stays open until those packages
  widen their range; Dependabot will keep reporting it as "update not possible".
  **(Superseded 2026-11-18 - both packages widened their range and the advisory
  is closed; see the entry above.)**

- **2026-11-12** - Bounded every job and Playwright step. Two consecutive weekly
  health checks died with "the hosted runner lost communication with the
  server" after ~48 min, with no logs and nothing to cancel: when the runner
  disappears mid-job no step timeout can fire (no process is listening) and
  GitHub holds the run for its 6-hour default. `ci.yml` and `health-check.yml`
  now cap the job (30 min backstop) plus the browser install (15 min) and the
  smoke run (10 min); the report upload also fires on `cancelled()`, and
  `globalTimeout` in `playwright.config.ts` (10 min, CI only) turns a wedged
  browser/preview server into a normal failure with a report instead of a
  silent stall. Tradeoff: an unusually slow runner now fails and needs a
  re-run where it used to scrape through (one install took 16 min); a re-run is
  cheaper than an unkillable 6-hour run.

- **2026-06-11 (later)** - Fixed the "Live query runs forever, works after refresh"
  bug. Root cause: all nine SPARQL category queries fired concurrently, but WDQS
  throttles parallel queries per IP, so surplus queries crawled toward the 60s
  server timeout while `Promise.allSettled` waited for the slowest; a refresh
  appeared to fix it only because WDQS had cached the results server-side.
  `fetchAllProduce` now runs a 3-worker pool and reports progress per category;
  `App.tsx` streams partial results into the grid as categories land, shows a
  progress count, and guards every callback against aborted runs (the old
  `.finally` could clear a newer run's loading flag, and the `wikidataItems`
  effect dependency would have aborted in-flight work on any partial update -
  replaced with a run-state ref + refresh tick).

- **2026-06-11** - LTS/latest upgrade pass: React 18 → 19, Vite → latest, TS → 6.0,
  Playwright → 1.60, Node pin 22 → 24 (`.nvmrc`, `engines`). Added the missing
  `src/vite-env.d.ts` (TS 6 errors on side-effect CSS imports without it).
  Added Firefox + WebKit Playwright projects (multi-browser backlog item); CI
  installs all three browsers. 21 e2e tests pass (7 × 3 browsers). **Tailwind
  kept at 3.x** - v4 is a breaking config rewrite, tracked in the backlog.

- **2026-06-03** - Added `PROGRESS.md` (this file), a thin
  `.github/copilot-instructions.md` pointing at `AGENTS.md`, and ESLint +
  Prettier. AGENTS.md stays the single source of truth for conventions; the
  Copilot file only references it to avoid drift.
- **License → All Rights Reserved.** Switched from a permissive stance and
  filled in `package.json` metadata (`4e35e2a`). Code is public for inspection,
  not reuse.
- **Modal fallback emoji bug fixed.** Card and modal now share
  `category-defaults.ts`, so a spice no longer shows 🌶 on the card and 🌿 in
  the modal (`9f1cddb`).
- **Background gradient lives on `body::before`.** Reverted an attempt to move
  the background and reserve a scrollbar gutter to `html`; the dark-mode page
  colour felt wrong afterwards (`450f5a1`, `1e44777`).
- **AGENTS.md added** as the operator's manual capturing hard-won style
  conventions and their history (`278976f`).
- **Detail-view emoji motion** composed across three elements (float / pop /
  hover) to avoid fighting transforms on one element (`33dd70b`, `deedb09`).
- **Grain & legume QIDs corrected** after an upstream Wikidata rename - the
  template case for the maintenance runbook above (`26292ed`).

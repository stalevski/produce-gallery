# PROGRESS

A lightweight, hand-maintained status board so this project can be picked up on
any device (or by anyone) without losing context. Commit it like code — it is
the answer to "where was I?" and "what next?".

The README is the pitch, [AGENTS.md](AGENTS.md) is the operator's manual, and
this file is the live state. Update the relevant section in the same commit as
the work it describes, and date your entries (`YYYY-MM-DD`).

---

## Current focus

_What is actively being worked on right now. Keep this short — move finished
items to the decision log, move not-yet-started ideas to the backlog._

- _Nothing in flight. Add the task you're starting here._

---

## Backlog / Roadmap

_Future ideas, roughly ordered by appetite. Pull an item up to "Current focus"
when you start it._

- **Multi-browser e2e** — Playwright currently runs Chromium only; add Firefox
  and WebKit projects if broader browser support matters.
- **Unit tests (Vitest)** — pure logic worth covering: URL state parse/encode in
  `src/App.tsx`, filter/sort logic, the generic-label filter in
  `src/services/wikidata.ts`. Would pair with the existing Playwright smoke suite.
- **Wikidata maintenance runbook** — step-by-step for upstream QID drift (e.g. a
  repeat of the grain/legume rename in `26292ed`): reproduce in the Query
  Service, fix `category-qids.json`, bump the cache key, regenerate the snapshot.
- **Pre-commit hooks (Husky + lint-staged)** — run lint/format on staged files
  once ESLint/Prettier have settled in.
- **Accessibility pass** — audit focus order, ARIA on the modal, and colour
  contrast in both themes.

---

## Known issues & limitations

_Accepted tradeoffs and rough edges. Many of these are deliberate — see
[AGENTS.md](AGENTS.md) for the rationale before "fixing" them._

- **Modal-open layout shift (~16px).** Opening the detail modal sets
  `body { overflow: hidden }`, removing the scrollbar and reflowing the page
  wider. `scrollbar-gutter: stable` was tried and reverted because it hurt the
  dark-mode page colour. Deliberate; don't relitigate without checking first.
- **Chromium-only test coverage.** Firefox/Safari are untested (see backlog).
- **No linter historically** — being addressed via ESLint/Prettier; expect an
  initial cleanup pass as rules bed in.
- **Live source depends on public Wikidata SPARQL.** Endpoint outages or
  ontology changes can break the Live tier; the Snapshot tier is the safety net
  and `health-check.yml` warns weekly when upstream drifts.
- **Dark-mode surface/ring contrast is intentionally subtle.** Bumping it has
  been tried and reverted.

---

## Decision log / changelog

_Append-only. Newest first. Record the **why** and the tradeoff, not just the
what — the git history already has the what. Seeded from recent commits._

- **2026-06-03** — Added `PROGRESS.md` (this file), a thin
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
- **Grain & legume QIDs corrected** after an upstream Wikidata rename — the
  template case for the maintenance runbook above (`26292ed`).

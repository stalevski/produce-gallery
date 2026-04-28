# AGENTS.md

Notes for any future contributor or AI agent picking this codebase up. The
README is the user-facing pitch; this file is the operator's manual.

## What this is

A small React + TypeScript + Vite + Tailwind site that browses fruits,
vegetables, herbs, spices, nuts, mushrooms, legumes, grains, and seeds
across **three data tiers**:

1. **Curated** — 105 hand-written entries in `src/data/curated.ts`.
2. **Snapshot** — ~1,870 items frozen from Wikidata into
   `src/data/wikidata-snapshot.json`. Bundled with the app.
3. **Live** — fetched from Wikidata SPARQL on demand, with localStorage
   caching, in `src/services/wikidata.ts`.

Deployed to GitHub Pages at <https://stalevski.github.io/produce-gallery/>
under the base path `/produce-gallery/` (see `vite.config.ts`).

## Quick start

```sh
npm install            # node >= 20 (engines field)
npm run dev            # local dev server, http://localhost:5173
npm run build          # tsc -b + vite build, outputs dist/
npm run preview        # serves dist/ at the production base path
npm run test:e2e       # headless Playwright smoke suite
npm run snapshot       # regenerates src/data/wikidata-snapshot.json
```

Always run `npm run build && npm run test:e2e` before committing UI changes.
The smoke tests are fast (~15s) and have caught real regressions every time.

## Source layout

| Path | Purpose |
|---|---|
| `src/App.tsx` | Top-level layout, source/theme toggles, filter state |
| `src/components/` | `ProduceCard`, `FilterBar`, `Pagination`, `DetailView`, `SkeletonCard`, `HighlightedText` |
| `src/services/wikidata.ts` | Live SPARQL client, cache key, generic-label filtering |
| `src/services/wikipedia.ts` | REST summary fetch for the modal |
| `src/data/curated.ts` | The hand-written dataset (formerly `produce.ts`) |
| `src/data/wikidata-snapshot.json` | Frozen Wikidata bundle |
| `src/data/category-qids.json` | **Single source of truth** for category → QID |
| `src/types.ts` | `Category`, `Source`, `ProduceItem` |
| `src/index.css` | CSS variables, fonts, gradient on `html`, motion keyframes |
| `tailwind.config.js` | Class-based dark mode, palette via CSS variables |
| `scripts/generate-snapshot.mjs` | Snapshot generator (run via `npm run snapshot`) |

## Single source of truth files

Touching one of these without touching its consumers is how bugs creep in.

- **`src/data/category-qids.json`** — every consumer of category QIDs
  (snapshot generator, live SPARQL client) imports from here. Do **not**
  hardcode QIDs anywhere else. If you add a category here, you must also
  extend `Category` in `src/types.ts`, the three category maps in
  `DetailView.tsx`, the emoji and default-hex maps in `ProduceCard.tsx`,
  the chips in `FilterBar.tsx`, and the default colour in `wikidata.ts`.
  TypeScript will tell you which files break (use `Record<Category, X>`).

- **Wikidata cache key** — `src/services/wikidata.ts` keys localStorage by
  a versioned string (currently `v6`). **Bump the version any time the
  cached value's shape or contents would change** (new category, fixed
  QID, new generic-label filter). Otherwise users hit stale cache.

- **Snapshot sanity gate** — `scripts/generate-snapshot.mjs` aborts if any
  category has fewer than 15 items. If that fires, the QID is wrong; fix
  the QID, do not lower the threshold.

## Style conventions that have already burned us

- **`ring-ink/X` flips with theme.** `ink` is light in dark mode, so the
  same ring becomes a faint white line. Use `ring-ink/X` when you *want*
  the ring to flip (focus rings); use `ring-black/X` only when you want
  it dark in both modes. The static card rings are intentionally
  `ring-ink/5` — Stefan revisited and chose to keep the subtle dark-mode
  highlight in 2026-04. Do not "fix" it without asking.

- **Dark-mode surface contrast is deliberately subtle.** `--c-surface`
  vs `--c-cream` differ by ~20 RGB units in dark mode. Bumping it to make
  cards "more visible" was tried and reverted. Don't relitigate.

- **The page background lives entirely on `body`**: `body` paints the
  cream base colour and `body::before` paints the warm radial gradients
  as a fixed-position pseudo-element. We tried moving cream to `html`
  and reserving scrollbar gutter to fix two related cosmetic bugs (a
  ~16px page shift on modal open, and a faint Dark Reader gutter seam)
  but Stefan rolled both fixes back because the dark-mode page colour
  felt off afterwards. **Known cost**: opening the detail modal sets
  `body { overflow: hidden }`, which removes the scrollbar and reflows
  the page ~16px wider. Don't reintroduce `scrollbar-gutter: stable`
  without checking with Stefan; the visual cost in dark mode wasn't
  worth the layout-stability fix.

- **Modal entry/exit needs two-phase mount.** `DetailView` keeps a
  `displayItem` separate from the `itemProp` so the modal can keep
  rendering through its 200ms exit fade. The `TRANSITION_MS` constant
  must match the Tailwind `duration-200` classes on the panel and
  backdrop.

- **The detail-view emoji has three composed motions, on three separate
  elements:** outer span = continuous float, inner span = one-shot pop
  entrance + hover transform. **Never put two transform-animating rules
  on the same element**, they will fight. The `key={item.id}` on the
  inner span is intentional — re-fires the entrance when navigating
  between related items.

- **`prefers-reduced-motion` guard** at the bottom of `src/index.css`
  zeroes every animation and transition for users who request it. Test
  any new motion under that media query (Chrome devtools → Rendering →
  Emulate CSS prefers-reduced-motion).

- **Theme initialization runs inline in `index.html` *before* React
  mounts**, otherwise users on dark preference get a flash of light
  mode. Don't move the theme bootstrap into the React tree.

- **Fonts are self-hosted** Fontsource WOFF2 files in `src/assets/fonts/`,
  loaded via `@font-face` in `src/index.css` with `font-display: swap`.
  No Google Fonts CDN.

## Commit conventions

- Conventional-commits prefixes: `feat`, `fix`, `revert`, `chore`, `docs`,
  `refactor`, `style`, `test`. Lowercase after the colon.
- Subject ≤ ~72 chars, terse.
- Body explains the **why** and the tradeoff, not what the code does.
  Reviewers can see the diff.
- On Windows PowerShell, multi-line `-m` arguments get mangled by dashes
  and quotes. Use a here-string piped to a buffer file, then `git commit
  -F <file>`. The buffer filenames `.git-commit-msg.tmp` and
  `.commit-msg-buffer` are already gitignored for this purpose.

## CI / deployment

- `.github/workflows/ci.yml` — build, run Playwright, deploy to Pages on
  push to `main`. `pages-build-deployment` is the GitHub-managed step
  triggered by the artifact upload.
- `.github/workflows/health-check.yml` — scheduled run that detects
  upstream Wikidata changes (e.g. QID drift) before they bite real users.
- Cache busting is automatic via Vite's hashed asset filenames, but the
  HTML itself is cached on the GitHub Pages CDN for ~10 minutes. After a
  push, expect a hard refresh to be needed for that long.

## Things that are *not* in this repo, on purpose

- No CHANGELOG.md (git log serves the same purpose for one developer).
- No SECURITY.md (static site, no user data).
- No CODE_OF_CONDUCT.md or PR/issue templates yet (revisit if community
  contributions appear).
- No `ARCHITECTURE.md` (this file plus the README cover it).

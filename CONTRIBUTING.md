# Contributing to The Produce Gallery

Thanks for taking an interest. This is a small personal project, but contributions are welcome — bug fixes, new curated items, better SPARQL queries, accessibility improvements, all of it.

## Quick start

```bash
git clone https://github.com/stalevski/produce-app.git
cd produce-app
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Project structure

See the **Project layout** section in the `README.md` for a file-by-file breakdown.

## Ways to contribute

### Adding curated produce

Append to `src/data/produce.ts`. Match the `ProduceItem` shape from `src/types.ts`. The minimum is `id`, `name`, and `category`; everything else is optional but the richer the better. See existing entries for a template.

A few rules:

- Use a unique, lowercase, hyphen-free `id`.
- Pick a `colorHex` that visually matches the item — it drives the card's accent color.
- Keep `description` to one or two sentences; keep `funFact` similarly tight.
- For botanical names, use the accepted scientific binomial (e.g., `Salvia rosmarinus`, not the deprecated `Rosmarinus officinalis`).

### Improving the Wikidata source

The SPARQL query lives in `src/services/wikidata.ts`. The current query uses a hybrid `wdt:P279+` and `wdt:P31/wdt:P279*` traversal, with `wdt:P1672` (this-taxon-is-source-of) for image and Wikipedia article inheritance. If you find ingredients that *should* appear but don't, the most likely cause is the same kind of ontology mismatch that originally hid rosemary. Reproduce in the [Wikidata Query Service](https://query.wikidata.org/) before changing the query in code.

If you change the query shape in a way that affects results, bump the cache key in the same file (`CACHE_KEY = "produce-app:wikidata:vN"`) so users get fresh data on next load.

### Filing issues

When reporting a bug:

- Include the URL — filter state is encoded there, which makes reproduction trivial.
- Note the **source** (Curated or Wikidata) and the active **theme** (light or dark).
- For Wikidata-mode bugs, mention whether the cache had been refreshed recently.

### Pull requests

- Run `npx tsc -b` before pushing — there's no CI yet, but the project is strict-mode TypeScript and should compile clean.
- Match existing code style: Tailwind classes inline, no CSS modules, no styled-components. Components stay in `src/components/`. Services in `src/services/`.
- Keep commits focused and descriptive. The history reads like a changelog — try to keep it that way.

## Code of conduct

Be kind. The dataset is about food; food is meant to bring people together.

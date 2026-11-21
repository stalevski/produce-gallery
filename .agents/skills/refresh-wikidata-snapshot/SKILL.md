---
name: refresh-wikidata-snapshot
description: Refresh the bundled Wikidata snapshot or repair upstream QID drift. Use when a category looks empty or the weekly health check warns.
---

# Refresh the Wikidata snapshot

The Snapshot tier ships `src/data/wikidata-snapshot.json` (~1,870 items,
9 categories) inside the bundle so the app renders instantly and keeps working
when the SPARQL endpoint is down. It is frozen data: it only changes when
someone runs `npm run snapshot` and commits the result. Current shape:
grain 112, fruit 759, herb 126, vegetable 378, nut 15, spice 216, mushroom 58,
seed 144, legume 59.

## When this comes up

- `.github/workflows/health-check.yml` reported a category count drop, or the
  Snapshot tab renders far fewer items than the counts above.
- A category is empty or obviously wrong (the classic: Q12806 was "cereal
  grain" and silently became "abacus", leaving `grain` with 7 items).
- The data is stale and a refresh is wanted on its own merits.

## Procedure

1. **Read the current counts** so you can tell a real regression from a refresh:

   ```sh
   node -e "const s=require('./src/data/wikidata-snapshot.json');console.log(s.count);console.log(s.items.reduce((a,i)=>(a[i.category]=(a[i.category]||0)+1,a),{}))"
   ```

2. **Check the QIDs first.** `src/data/category-qids.json` is the single source
   of truth; the generator and the live client both read it. Drift almost always
   shows up here, not in the query. Verify a suspect QID by pasting its URL
   (`https://www.wikidata.org/wiki/Q12806`) into a browser before editing.

3. **Fix the QID in `category-qids.json` only.** Never inline a QID anywhere
   else - that is how this file earned its single-source-of-truth status.

4. **Regenerate:**

   ```sh
   npm run snapshot   # 9 SPARQL queries, ~1 minute, writes src/data/wikidata-snapshot.json
   ```

5. **Respect the sanity gate.** The generator aborts when any category returns
   fewer than 15 items (`MIN_ITEMS_PER_CATEGORY`). If it fires, the QID is wrong
   or Wikidata changed the ontology - fix the cause. Do **not** lower the
   threshold to get a green run.

6. **Bump the cache key** in `src/services/wikidata.ts`
   (`CACHE_KEY = "produce-gallery:wikidata:vN"` -> `vN+1`) whenever the
   snapshot contents or the cached shape change, otherwise returning users keep
   serving the old array from localStorage.

7. **Review the diff, not just the exit code.** Expected: `generatedAt`
   changes, `count` moves plausibly, items stay sorted by name and pretty-printed
   at 2 spaces (the file is prettier-ignored on purpose - it is generated).
   Reject the diff if a category's count collapses or if >50% of names changed
   without an upstream reason; spot-check a handful of new and removed entries.

8. **Verify:** `npm run verify`.

9. **Commit** as `chore(data): refresh wikidata snapshot` (or `fix(data):` for a
   drift repair) with the before/after counts in the body. Include the QID that
   changed and why - the diff cannot explain that on its own.

## Do not

- Hand-edit `wikidata-snapshot.json`; it is overwritten wholesale.
- Add a label to `GENERIC_LABELS` to hide a bad item - that filter exists for
  generic ontology terms ("fruit", "edible mushroom"), and widening it silently
  deletes real produce.
- Run this from CI. The health check only reports; regeneration is a reviewed
  commit because the diff is thousands of lines.

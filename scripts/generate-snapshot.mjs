// Fetches all 8 produce categories from the Wikidata SPARQL endpoint and
// writes the merged result to src/data/wikidata-snapshot.json. The snapshot
// is bundled with the app so users see Wikidata-style data instantly without
// a network round-trip, and the app keeps working even if the SPARQL endpoint
// is rate-limited or down.
//
// Re-run manually whenever you want to refresh:
//   npm run snapshot
//
// Or schedule a cron job to keep the bundled snapshot fresh.

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "..", "src", "data", "wikidata-snapshot.json");
const QIDS_PATH = join(__dirname, "..", "src", "data", "category-qids.json");

const ENDPOINT = "https://query.wikidata.org/sparql";

// Read the QIDs from the same JSON file the live service imports, so this
// script and src/services/wikidata.ts can never drift apart. (Reading via
// fs.readFileSync rather than `import ... with { type: "json" }` so this works
// on any Node 20+ without enabling the still-experimental import attributes.)
const CATEGORY_QIDS = JSON.parse(readFileSync(QIDS_PATH, "utf8"));

const CATEGORY_DEFAULT_COLOR = {
  fruit: { name: "Red", hex: "#D7263D" },
  vegetable: { name: "Green", hex: "#4F7F3F" },
  herb: { name: "Green", hex: "#6B8E23" },
  spice: { name: "Earth", hex: "#B7410E" },
  nut: { name: "Brown", hex: "#8B5A2B" },
  mushroom: { name: "Beige", hex: "#A89171" },
  legume: { name: "Olive", hex: "#7C8E47" },
  grain: { name: "Wheat", hex: "#D4A95A" },
};

const GENERIC_LABELS = new Set([
  "fruit",
  "edible fruit",
  "vegetable",
  "spice",
  "herb",
  "culinary herb",
  "leaf vegetable",
  "root vegetable",
  "berry",
  "citrus",
  "nut",
  "edible nut",
  "edible mushroom",
  "mushroom",
  "legume",
  "grain",
  "cereal",
  "edible seed",
]);

function buildQuery(qid) {
  return `SELECT DISTINCT ?item ?itemLabel ?itemDescription
       (SAMPLE(?fImage) AS ?image)
       (SAMPLE(?fArticle) AS ?article)
WHERE {
  { ?item wdt:P279+ wd:${qid} . }
  UNION
  { ?item wdt:P31/wdt:P279* wd:${qid} . }
  OPTIONAL { ?item wdt:P18 ?dImg }
  OPTIONAL {
    ?taxon wdt:P1672 ?item .
    ?taxon wdt:P18 ?tImg .
  }
  BIND(COALESCE(?dImg, ?tImg) AS ?fImage)
  OPTIONAL {
    ?dArt schema:about ?item ;
          schema:isPartOf <https://en.wikipedia.org/> .
  }
  OPTIONAL {
    ?taxon2 wdt:P1672 ?item .
    ?tArt schema:about ?taxon2 ;
          schema:isPartOf <https://en.wikipedia.org/> .
  }
  BIND(COALESCE(?dArt, ?tArt) AS ?fArticle)
  FILTER(BOUND(?fImage) || BOUND(?fArticle))
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
GROUP BY ?item ?itemLabel ?itemDescription
LIMIT 800`;
}

function thumbnailize(url, width = 480) {
  const https = url.startsWith("http://")
    ? url.replace("http://", "https://")
    : url;
  if (https.includes("/Special:FilePath/")) {
    const sep = https.includes("?") ? "&" : "?";
    return `${https}${sep}width=${width}`;
  }
  return https;
}

async function queryCategory(category) {
  const qid = CATEGORY_QIDS[category];
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(
    buildQuery(qid),
  )}`;

  console.log(`[snapshot] fetching ${category} (${qid})...`);
  const res = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent":
        "produce-gallery-snapshot-generator/1.0 (https://github.com/stalevski/produce-gallery)",
    },
  });
  if (!res.ok) {
    throw new Error(`Wikidata returned ${res.status} for ${category}`);
  }
  const json = await res.json();
  const fallback = CATEGORY_DEFAULT_COLOR[category];

  const items = [];
  for (const b of json.results.bindings) {
    const label = b.itemLabel?.value?.trim();
    if (!label) continue;
    if (/^Q\d+$/.test(label)) continue;
    if (GENERIC_LABELS.has(label.toLowerCase())) continue;

    const id = b.item.value.split("/").pop() ?? label;
    const item = {
      id: `wd:${id}`,
      name: label,
      category,
      color: fallback.name,
      colorHex: fallback.hex,
      source: "wikidata",
    };
    if (b.itemDescription?.value) item.description = b.itemDescription.value;
    if (b.image?.value) item.imageUrl = thumbnailize(b.image.value);
    if (b.article?.value) item.url = b.article.value;
    items.push(item);
  }
  console.log(`[snapshot]   ${category}: ${items.length} items`);
  return items;
}

// Minimum item count per category. Below this we assume something has gone
// wrong upstream (e.g. a QID got renamed -- Q12806 used to be "cereal grain"
// and silently became "abacus", returning only 7 unrelated items). The check
// is intentionally generous; even nut, our smallest legitimate category, has
// >20 items.
const MIN_ITEMS_PER_CATEGORY = 15;

async function main() {
  const categories = Object.keys(CATEGORY_QIDS);
  const all = [];
  const counts = {};
  for (const c of categories) {
    try {
      const items = await queryCategory(c);
      all.push(...items);
      counts[c] = items.length;
    } catch (err) {
      console.error(`[snapshot] FAILED ${c}: ${err.message}`);
      counts[c] = 0;
    }
  }

  const suspicious = Object.entries(counts).filter(
    ([, n]) => n < MIN_ITEMS_PER_CATEGORY,
  );
  if (suspicious.length > 0) {
    console.error(
      `\n[snapshot] ABORT: the following categories returned suspiciously few items.\n` +
        `Wikidata may have renamed/merged a QID. Check src/data/category-qids.json.`,
    );
    for (const [c, n] of suspicious) {
      console.error(`  ${c}: ${n} items (minimum ${MIN_ITEMS_PER_CATEGORY})`);
    }
    process.exit(1);
  }

  // Dedupe by id (an item can match multiple category subclass paths).
  const seen = new Set();
  const deduped = [];
  for (const item of all) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }
  deduped.sort((a, b) => a.name.localeCompare(b.name));

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    count: deduped.length,
    items: deduped,
  };
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(
    `[snapshot] wrote ${deduped.length} items to ${OUT_PATH} (${Math.round(
      JSON.stringify(payload).length / 1024,
    )} KB)`,
  );
}

main().catch((err) => {
  console.error("[snapshot] FATAL:", err);
  process.exit(1);
});

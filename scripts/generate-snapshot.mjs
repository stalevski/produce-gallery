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

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "..", "src", "data", "wikidata-snapshot.json");

const ENDPOINT = "https://query.wikidata.org/sparql";

const CATEGORY_QIDS = {
  fruit: "Q3314483",
  vegetable: "Q11004",
  spice: "Q42527",
  herb: "Q207123",
  nut: "Q11009",
  mushroom: "Q654236",
  legume: "Q11575",
  grain: "Q12806",
};

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
        "produce-app-snapshot-generator/1.0 (https://github.com/stalevski/produce-app)",
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

async function main() {
  const categories = Object.keys(CATEGORY_QIDS);
  const all = [];
  for (const c of categories) {
    try {
      const items = await queryCategory(c);
      all.push(...items);
    } catch (err) {
      console.error(`[snapshot] FAILED ${c}: ${err.message}`);
    }
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

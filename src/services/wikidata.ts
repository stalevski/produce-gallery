import type { Category, ProduceItem } from "../types";

const ENDPOINT = "https://query.wikidata.org/sparql";

const CATEGORY_QIDS: Record<Category, string> = {
  fruit: "Q3314483",
  vegetable: "Q11004",
  spice: "Q42527",
  herb: "Q207123",
  nut: "Q11009",
  mushroom: "Q654236",
  legume: "Q11575",
  grain: "Q12806",
};

const CATEGORY_DEFAULT_COLOR: Record<Category, { name: string; hex: string }> = {
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

interface SparqlBinding {
  item: { value: string };
  itemLabel?: { value: string };
  itemDescription?: { value: string };
  image?: { value: string };
  article?: { value: string };
}

interface SparqlResponse {
  results: { bindings: SparqlBinding[] };
}

function buildQuery(qid: string): string {
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

function thumbnailize(url: string, width = 480): string {
  const https = url.startsWith("http://") ? url.replace("http://", "https://") : url;
  if (https.includes("/Special:FilePath/")) {
    const sep = https.includes("?") ? "&" : "?";
    return `${https}${sep}width=${width}`;
  }
  return https;
}

async function queryCategory(category: Category, signal?: AbortSignal): Promise<ProduceItem[]> {
  const qid = CATEGORY_QIDS[category];
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(buildQuery(qid))}`;

  const res = await fetch(url, {
    headers: { Accept: "application/sparql-results+json" },
    signal,
  });
  if (!res.ok) {
    throw new Error(`Wikidata returned ${res.status} for ${category}`);
  }
  const json = (await res.json()) as SparqlResponse;
  const fallback = CATEGORY_DEFAULT_COLOR[category];

  const items: ProduceItem[] = [];
  for (const b of json.results.bindings) {
    const label = b.itemLabel?.value?.trim();
    if (!label) continue;
    if (/^Q\d+$/.test(label)) continue;
    if (GENERIC_LABELS.has(label.toLowerCase())) continue;

    const id = b.item.value.split("/").pop() ?? label;
    items.push({
      id: `wd:${id}`,
      name: label,
      category,
      description: b.itemDescription?.value,
      imageUrl: b.image?.value ? thumbnailize(b.image.value) : undefined,
      color: fallback.name,
      colorHex: fallback.hex,
      source: "wikidata",
      url: b.article?.value,
    });
  }
  return items;
}

export async function fetchAllProduce(signal?: AbortSignal): Promise<ProduceItem[]> {
  // Derive the category list from CATEGORY_QIDS so adding a new category in
  // one place automatically extends the live fetch alongside the snapshot.
  const cats = Object.keys(CATEGORY_QIDS) as Category[];
  const settled = await Promise.allSettled(cats.map((c) => queryCategory(c, signal)));

  const successes = settled
    .filter((r): r is PromiseFulfilledResult<ProduceItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  if (successes.length === 0) {
    const firstFailure = settled.find(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );
    throw firstFailure?.reason ?? new Error("Wikidata returned no results");
  }

  const map = new Map<string, ProduceItem>();
  for (const item of successes) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

const CACHE_KEY = "produce-gallery:wikidata:v4";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export function loadFromCache(): ProduceItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; items: ProduceItem[] };
    if (!parsed?.ts || !Array.isArray(parsed.items)) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

export function saveToCache(items: ProduceItem[]): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), items })
    );
  } catch {
    // ignore quota / privacy mode errors
  }
}

export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

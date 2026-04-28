export type Category =
  | "fruit"
  | "vegetable"
  | "herb"
  | "spice"
  | "nut"
  | "mushroom"
  | "legume"
  | "grain"
  | "seed";

export type Season = "spring" | "summer" | "autumn" | "winter";

// "snapshot" loads a frozen Wikidata dump bundled with the app (instant, offline-safe).
// "wikidata" queries the live SPARQL endpoint (fresh, network-dependent).
export type Source = "curated" | "snapshot" | "wikidata";

export interface ImageAttribution {
  author?: string;
  license?: string;
  sourceUrl?: string;
}

export interface ProduceItem {
  id: string;
  name: string;
  category: Category;
  emoji?: string;
  imageUrl?: string;
  imageAttribution?: ImageAttribution;
  color?: string;
  colorHex?: string;
  seasons?: Season[];
  peakSeasons?: Season[];
  origin?: string;
  description?: string;
  funFact?: string;
  botanicalName?: string;
  family?: string;
  pairings?: string[];
  source?: Source;
  url?: string;
}

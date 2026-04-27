export type Category =
  | "fruit"
  | "vegetable"
  | "herb"
  | "spice"
  | "nut"
  | "mushroom"
  | "legume"
  | "grain";

export type Season = "spring" | "summer" | "autumn" | "winter";

export type Source = "curated" | "wikidata";

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

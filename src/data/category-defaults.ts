import type { Category } from "../types";

// Per-category fallbacks used when an item from the snapshot or live
// Wikidata tiers doesn't carry its own emoji / colorHex. Both ProduceCard
// and DetailView import from here so the card and the modal can never
// disagree on which emoji or accent colour to render.
//
// Pre-2026-05 these maps were duplicated across both components and the
// modal's CATEGORY_EMOJI was missing entirely -- it had a hardcoded
// herb-leaf 🌿 fallback regardless of category, which made e.g. spice
// items show a chili 🌶 on the card but a leaf 🌿 in the modal. Treating
// these as a single source of truth eliminates that whole bug class.
//
// To add a new category: extend `Category` in `src/types.ts`, add an
// entry here, and the rest of the codebase will fail to compile until
// the other category-specific maps (CATEGORY_LABEL in DetailView, the
// chips in FilterBar, etc.) are updated. Use the `Record<Category, X>`
// type so TypeScript catches missing keys.

export const CATEGORY_EMOJI: Record<Category, string> = {
  fruit: "\u{1F34E}",
  vegetable: "\u{1F96C}",
  herb: "\u{1F33F}",
  spice: "\u{1F336}",
  nut: "\u{1F95C}",
  mushroom: "\u{1F344}",
  legume: "\u{1FAD8}",
  grain: "\u{1F33E}",
  seed: "\u{1F330}",
};

export const CATEGORY_DEFAULT_HEX: Record<Category, string> = {
  fruit: "#D7263D",
  vegetable: "#4F7F3F",
  herb: "#6B8E23",
  spice: "#B7410E",
  nut: "#8B5A2B",
  mushroom: "#A89171",
  legume: "#7C8E47",
  grain: "#D4A95A",
  seed: "#C8A37B",
};

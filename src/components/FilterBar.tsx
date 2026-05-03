import { forwardRef } from "react";
import { ImageIcon, RotateCcw, Search, X } from "lucide-react";
import type { Category, Season } from "../types";

export type CategoryFilter = "all" | Category;
export type SeasonFilter = "all" | Season;
export type SortKey = "name-asc" | "name-desc" | "category" | "random";

interface FilterBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  category: CategoryFilter;
  onCategoryChange: (c: CategoryFilter) => void;
  season: SeasonFilter;
  onSeasonChange: (s: SeasonFilter) => void;
  colors: string[];
  activeColor: string | null;
  onColorChange: (c: string | null) => void;
  resultCount: number;
  totalCount: number;
  showSeasons?: boolean;
  showColors?: boolean;
  showPhotoFilter?: boolean;
  requireImage?: boolean;
  onRequireImageChange?: (v: boolean) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  onResetAll?: () => void;
  hasActiveFilters?: boolean;
}

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "fruit", label: "Fruits" },
  { value: "vegetable", label: "Vegetables" },
  { value: "herb", label: "Herbs" },
  { value: "spice", label: "Spices" },
  { value: "nut", label: "Nuts" },
  { value: "seed", label: "Seeds" },
  { value: "mushroom", label: "Mushrooms" },
  { value: "legume", label: "Legumes" },
  { value: "grain", label: "Grains" },
];

const SEASONS: { value: SeasonFilter; label: string }[] = [
  { value: "all", label: "Any season" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "autumn", label: "Autumn" },
  { value: "winter", label: "Winter" },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "category", label: "By category" },
  { value: "random", label: "Random" },
];

export const FilterBar = forwardRef<HTMLInputElement, FilterBarProps>(function FilterBar(
  {
    query,
    onQueryChange,
    category,
    onCategoryChange,
    season,
    onSeasonChange,
    colors,
    activeColor,
    onColorChange,
    resultCount,
    totalCount,
    showSeasons = true,
    showColors = true,
    showPhotoFilter = false,
    requireImage = false,
    onRequireImageChange,
    sort,
    onSortChange,
    onResetAll,
    hasActiveFilters = false,
  },
  searchInputRef
) {
  return (
    <div className="flex flex-col gap-5 rounded-3xl bg-surface/60 p-5 ring-1 ring-ink/5 backdrop-blur-sm shadow-soft">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search produce, origin..."
          title="Search by name, color, origin, or description. Press / to focus."
          className="w-full rounded-2xl border-0 bg-surface py-3 pl-11 pr-10 text-sm text-ink placeholder:text-ink/40 ring-1 ring-ink/5 outline-none transition focus:ring-2 focus:ring-ink/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink/40 transition hover:bg-ink/5 hover:text-ink/70"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => {
            const active = c.value === category;
            // Clicking the active non-"all" chip clears it back to "all", so
            // category chips behave like the color chips and the has-photo
            // toggle: a single click both selects and deselects.
            const handleClick = () => {
              if (active && c.value !== "all") {
                onCategoryChange("all");
              } else {
                onCategoryChange(c.value);
              }
            };
            return (
              <button
                key={c.value}
                type="button"
                onClick={handleClick}
                aria-pressed={active}
                title={
                  active && c.value !== "all"
                    ? `Clear ${c.label.toLowerCase()} filter`
                    : c.value === "all"
                      ? "Show all categories"
                      : `Filter by ${c.label.toLowerCase()}`
                }
                className={
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition " +
                  (active
                    ? "bg-ink text-cream shadow-soft"
                    : "bg-surface text-ink/70 ring-1 ring-ink/5 hover:bg-ink/5")
                }
              >
                {c.label}
              </button>
            );
          })}
          {showPhotoFilter && onRequireImageChange && (
            <button
              type="button"
              onClick={() => onRequireImageChange(!requireImage)}
              aria-pressed={requireImage}
              title={requireImage ? "Show all items" : "Only items with photos"}
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition " +
                (requireImage
                  ? "bg-ink text-cream shadow-soft"
                  : "bg-surface text-ink/70 ring-1 ring-ink/5 hover:bg-ink/5")
              }
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Has photo
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {showSeasons && (
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-wider text-ink/50">
                Season
              </label>
              <select
                value={season}
                onChange={(e) => onSeasonChange(e.target.value as SeasonFilter)}
                className="rounded-full bg-surface px-3.5 py-1.5 text-sm font-medium text-ink/80 ring-1 ring-ink/5 outline-none transition focus:ring-2 focus:ring-ink/30"
              >
                {SEASONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="text-xs uppercase tracking-wider text-ink/50">
              Sort
            </label>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as SortKey)}
              className="rounded-full bg-surface px-3.5 py-1.5 text-sm font-medium text-ink/80 ring-1 ring-ink/5 outline-none transition focus:ring-2 focus:ring-ink/30"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {showColors && (
          <>
            <span className="text-xs uppercase tracking-wider text-ink/50">
              Color
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onColorChange(null)}
                className={
                  "rounded-full px-3 py-1 text-xs font-medium transition " +
                  (activeColor === null
                    ? "bg-ink text-cream"
                    : "bg-surface text-ink/70 ring-1 ring-ink/5 hover:bg-ink/5")
                }
              >
                Any
              </button>
              {colors.map((c) => {
                const active = activeColor === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onColorChange(active ? null : c)}
                    className={
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition " +
                      (active
                        ? "bg-ink text-cream"
                        : "bg-surface text-ink/70 ring-1 ring-ink/5 hover:bg-ink/5")
                    }
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: colorHex(c) }}
                    />
                    {c}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <span className="ml-auto flex items-center gap-3 text-xs text-ink/50">
          <span>
            {resultCount} of {totalCount}
          </span>
          {hasActiveFilters && onResetAll && (
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink/70 ring-1 ring-ink/5 transition hover:bg-ink/5 hover:text-ink"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </span>
      </div>
    </div>
  );
});

function colorHex(name: string): string {
  switch (name.toLowerCase()) {
    case "red":
      return "#D7263D";
    case "orange":
      return "#F08A24";
    case "yellow":
      return "#F4C430";
    case "green":
      return "#4F7F3F";
    case "blue":
      return "#3D5A80";
    case "purple":
      return "#5C2A6A";
    case "white":
      return "#E8E1CD";
    case "brown":
      return "#7B5A35";
    case "beige":
      return "#C9A77B";
    case "wheat":
      return "#D4A95A";
    case "olive":
      return "#7C8E47";
    case "earth":
      return "#B7410E";
    default:
      return "#999";
  }
}

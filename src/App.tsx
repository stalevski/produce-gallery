import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Database,
  Leaf,
  Loader2,
  Moon,
  RefreshCw,
  Sprout,
  Sun,
} from "lucide-react";
import { CURATED } from "./data/curated";
import { ProduceCard } from "./components/ProduceCard";
import {
  FilterBar,
  type CategoryFilter,
  type SeasonFilter,
  type SortKey,
} from "./components/FilterBar";
import { Pagination, paginate, type PageSize } from "./components/Pagination";
import { DetailView } from "./components/DetailView";
import { SkeletonGrid } from "./components/SkeletonCard";
import type { ProduceItem, Source } from "./types";
import {
  clearCache,
  fetchAllProduce,
  loadFromCache,
  saveToCache,
} from "./services/wikidata";

function readInitialState() {
  const p =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const sizeRaw = p.get("size");
  let pageSize: PageSize = 50;
  if (sizeRaw === "all") pageSize = "all";
  else {
    const n = Number(sizeRaw);
    if (n === 25 || n === 50 || n === 100 || n === 200) pageSize = n;
  }
  const sortRaw = p.get("sort");
  const sort: SortKey =
    sortRaw === "name-desc" || sortRaw === "category" || sortRaw === "random"
      ? sortRaw
      : "name-asc";
  return {
    query: p.get("q") ?? "",
    category: (p.get("cat") as CategoryFilter) ?? "all",
    season: (p.get("season") as SeasonFilter) ?? "all",
    color: p.get("color"),
    source: ((): Source => {
      const v = p.get("src");
      return v === "snapshot" || v === "wikidata" ? v : "curated";
    })(),
    pageSize,
    page: Math.max(0, (Number(p.get("page")) || 1) - 1),
    requireImage: p.get("photo") === "1",
    selectedId: p.get("item"),
    sort,
  };
}

export default function App() {
  const initial = readInitialState();
  const [query, setQuery] = useState(initial.query);
  const [category, setCategory] = useState<CategoryFilter>(initial.category);
  const [season, setSeason] = useState<SeasonFilter>(initial.season);
  const [color, setColor] = useState<string | null>(initial.color);
  const [source, setSource] = useState<Source>(initial.source);
  const [pageSize, setPageSize] = useState<PageSize>(initial.pageSize);
  const [page, setPage] = useState(initial.page);
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId);
  const [requireImage, setRequireImage] = useState(initial.requireImage);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("produce-gallery:theme", theme);
    } catch {
      /* localStorage unavailable */
    }
  }, [theme]);

  const [wikidataItems, setWikidataItems] = useState<ProduceItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [snapshotItems, setSnapshotItems] = useState<ProduceItem[] | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "wikidata") return;
    if (wikidataItems) return;

    const cached = loadFromCache();
    if (cached && cached.length > 0) {
      setWikidataItems(cached);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetchAllProduce(ctrl.signal)
      .then((items) => {
        setWikidataItems(items);
        saveToCache(items);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Failed to load Wikidata";
        setError(message);
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [source, wikidataItems]);

  // Lazy-load the bundled Wikidata snapshot the first time the user picks Snapshot
  // mode. Vite splits the JSON into its own chunk so the initial bundle stays small.
  useEffect(() => {
    if (source !== "snapshot") return;
    if (snapshotItems) return;

    let cancelled = false;
    setLoadingSnapshot(true);
    setSnapshotError(null);
    import("./data/wikidata-snapshot.json")
      .then((mod) => {
        if (cancelled) return;
        const data = mod.default as { items: ProduceItem[] };
        setSnapshotItems(data.items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load snapshot";
        setSnapshotError(message);
      })
      .finally(() => {
        if (!cancelled) setLoadingSnapshot(false);
      });

    return () => {
      cancelled = true;
    };
  }, [source, snapshotItems]);

  const dataset = useMemo<ProduceItem[]>(() => {
    if (source === "wikidata" && wikidataItems) return wikidataItems;
    if (source === "snapshot" && snapshotItems) return snapshotItems;
    return CURATED;
  }, [source, wikidataItems, snapshotItems]);

  const colors = useMemo(() => {
    const set = new Set<string>();
    dataset.forEach((p) => {
      if (p.color) set.add(p.color);
    });
    return Array.from(set).sort();
  }, [dataset]);

  const hasSeasons = useMemo(
    () => dataset.some((p) => p.seasons && p.seasons.length > 0),
    [dataset]
  );

  const hasColorVariety = useMemo(() => {
    const distinctCategories = new Set(dataset.map((p) => p.category)).size;
    return colors.length > distinctCategories;
  }, [dataset, colors]);

  useEffect(() => {
    if (!hasSeasons && season !== "all") setSeason("all");
  }, [hasSeasons, season]);

  useEffect(() => {
    if (!hasColorVariety && color !== null) setColor(null);
  }, [hasColorVariety, color]);

  const isFirstFilterChange = useRef(true);
  useEffect(() => {
    if (isFirstFilterChange.current) {
      isFirstFilterChange.current = false;
      return;
    }
    setPage(0);
  }, [query, category, season, color, source, pageSize, requireImage, sort]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      e.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cacheWarmedRef = useRef(false);
  useEffect(() => {
    if (source !== "curated") return;
    if (cacheWarmedRef.current) return;
    if (loadFromCache()) return;
    const timeout = window.setTimeout(() => {
      cacheWarmedRef.current = true;
      const ctrl = new AbortController();
      fetchAllProduce(ctrl.signal)
        .then((items) => saveToCache(items))
        .catch(() => {
          /* silent — we'll retry on user toggle */
        });
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [source]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category !== "all") params.set("cat", category);
    if (season !== "all") params.set("season", season);
    if (color) params.set("color", color);
    if (source !== "curated") params.set("src", source);
    if (pageSize !== 50) params.set("size", String(pageSize));
    if (page !== 0) params.set("page", String(page + 1));
    if (requireImage) params.set("photo", "1");
    if (selectedId) params.set("item", selectedId);
    if (sort !== "name-asc") params.set("sort", sort);
    const search = params.toString();
    const newUrl = search
      ? `${window.location.pathname}?${search}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [
    query,
    category,
    season,
    color,
    source,
    pageSize,
    page,
    requireImage,
    selectedId,
    sort,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dataset.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (season !== "all" && p.seasons && !p.seasons.includes(season)) return false;
      if (color && p.color && p.color !== color) return false;
      if (requireImage && !p.imageUrl) return false;
      if (q) {
        const hay = [p.name, p.color, p.origin, p.description, p.funFact]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dataset, query, category, season, color, requireImage]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case "name-asc":
        arr.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        arr.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "category":
        arr.sort(
          (a, b) =>
            a.category.localeCompare(b.category) ||
            a.name.localeCompare(b.name)
        );
        break;
      case "random":
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        break;
    }
    return arr;
  }, [filtered, sort]);

  const pageItems = useMemo(
    () => paginate(sorted, page, pageSize),
    [sorted, page, pageSize]
  );

  const itemsById = useMemo(() => {
    const map = new Map<string, ProduceItem>();
    for (const p of dataset) map.set(p.id, p);
    return map;
  }, [dataset]);

  const selectedItem = selectedId ? itemsById.get(selectedId) ?? null : null;

  const refresh = () => {
    clearCache();
    setWikidataItems(null);
  };

  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setSeason("all");
    setColor(null);
    setRequireImage(false);
  };

  const hasActiveFilters =
    !!query ||
    category !== "all" ||
    season !== "all" ||
    color !== null ||
    requireImage;

  const showLoading =
    (source === "wikidata" && loading && !wikidataItems) ||
    (source === "snapshot" && loadingSnapshot && !snapshotItems);
  const showError =
    (source === "wikidata" && error && !wikidataItems) ||
    (source === "snapshot" && snapshotError && !snapshotItems);
  const errorMessage = source === "snapshot" ? snapshotError : error;

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="mb-10 flex flex-col gap-6 sm:mb-14">
          <div className="flex items-center justify-between gap-4 text-ink/60">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.2em]">
                The Produce Gallery
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle theme={theme} onChange={setTheme} />
              <SourceToggle source={source} onChange={setSource} />
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              A small library
              <br />
              of <em className="italic text-[#3f6b3a] dark:text-[#9bd991]">growing things</em>.
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-ink/70">
              A catalogue of fruits, vegetables, herbs, and spices — their colors,
              seasons, and the quiet stories behind them. Curated by hand,
              from a frozen Wikidata snapshot, or streamed live.
            </p>
          </div>
        </header>

        {showLoading && (
          <>
            <div className="mb-8 flex items-center gap-3 rounded-3xl bg-surface/60 p-5 ring-1 ring-ink/5 backdrop-blur-sm">
              <Loader2 className="h-5 w-5 animate-spin text-ink/60" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-ink">
                  {source === "snapshot"
                    ? "Loading the bundled Wikidata snapshot..."
                    : "Asking Wikidata for fruits, vegetables, herbs, spices, nuts, mushrooms, legumes, and grains..."}
                </span>
                <span className="text-xs text-ink/50">
                  {source === "snapshot"
                    ? "A small JSON chunk; usually a fraction of a second."
                    : "This usually takes 5-15 seconds. Results cache locally for a week."}
                </span>
              </div>
            </div>
            <SkeletonGrid count={8} />
          </>
        )}

        {showError && (
          <div className="mb-8 flex flex-col gap-3 rounded-3xl bg-surface/60 p-5 ring-1 ring-ink/5 backdrop-blur-sm sm:flex-row sm:items-center">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">
                {source === "snapshot"
                  ? "Couldn't load the snapshot bundle."
                  : "Wikidata didn't answer this time."}
              </p>
              <p className="text-xs text-ink/60">{errorMessage}</p>
            </div>
            <div className="flex gap-2">
              {source === "wikidata" && (
                <>
                  <button
                    type="button"
                    onClick={refresh}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-cream transition hover:opacity-90"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => setSource("snapshot")}
                    className="rounded-full bg-surface px-3.5 py-1.5 text-xs font-medium text-ink/70 ring-1 ring-ink/5 transition hover:bg-ink/5"
                  >
                    Use snapshot
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setSource("curated")}
                className="rounded-full bg-surface px-3.5 py-1.5 text-xs font-medium text-ink/70 ring-1 ring-ink/5 transition hover:bg-ink/5"
              >
                Use curated
              </button>
            </div>
          </div>
        )}

        {!showLoading && !showError && (
          <>
            <div className="mb-8">
              <FilterBar
                ref={searchInputRef}
                query={query}
                onQueryChange={setQuery}
                category={category}
                onCategoryChange={setCategory}
                season={season}
                onSeasonChange={setSeason}
                colors={colors}
                activeColor={color}
                onColorChange={setColor}
                resultCount={filtered.length}
                totalCount={dataset.length}
                showSeasons={hasSeasons}
                showColors={hasColorVariety}
                showPhotoFilter={source !== "curated"}
                requireImage={requireImage}
                onRequireImageChange={setRequireImage}
                sort={sort}
                onSortChange={setSort}
                onResetAll={resetFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </div>

            {filtered.length > 0 ? (
              <>
                <div className="mb-6">
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    totalCount={filtered.length}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
                <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pageItems.map((item) => (
                    <ProduceCard
                      key={item.id}
                      item={item}
                      onClick={(it) => setSelectedId(it.id)}
                      query={query}
                    />
                  ))}
                </section>
                <div className="mt-8">
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    totalCount={filtered.length}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-surface/60 px-6 py-20 text-center ring-1 ring-ink/5 backdrop-blur-sm">
                <EmptyIllustration />
                <h2 className="font-display text-2xl text-ink">Nothing in season</h2>
                <p className="max-w-sm text-sm text-ink/60">
                  No produce matches these filters. Try clearing a few — the harvest
                  shifts with patience.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition hover:opacity-90"
                >
                  Reset filters
                </button>
              </div>
            )}

            {source === "wikidata" && wikidataItems && wikidataItems.length > 0 && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={refresh}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-xs font-medium text-ink/60 ring-1 ring-ink/5 transition hover:bg-ink/5 hover:text-ink"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh from Wikidata
                </button>
              </div>
            )}
          </>
        )}

        <DetailView
          item={selectedItem}
          onClose={() => setSelectedId(null)}
          onSelectId={(id) => setSelectedId(id)}
          itemsById={itemsById}
        />

        <footer className="mt-16 flex flex-col items-center gap-1 text-center text-xs text-ink/40">
          <span>
            {source === "wikidata"
              ? "Streamed live from Wikidata. Cached locally."
              : source === "snapshot"
                ? "Bundled Wikidata snapshot. Frozen at build time."
                : "Grown locally. Rendered on demand."}
          </span>
          <span>{new Date().getFullYear()} - The Produce Gallery</span>
        </footer>
      </div>
    </div>
  );
}

interface SourceToggleProps {
  source: Source;
  onChange: (s: Source) => void;
}

interface ThemeToggleProps {
  theme: "light" | "dark";
  onChange: (t: "light" | "dark") => void;
}

function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink/70 shadow-soft ring-1 ring-ink/5 transition hover:bg-ink/5 hover:text-ink"
    >
      {theme === "dark" ? (
        <Sun className="h-3.5 w-3.5" />
      ) : (
        <Moon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function SourceToggle({ source, onChange }: SourceToggleProps) {
  const tabClass = (active: boolean) =>
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition " +
    (active ? "bg-ink text-cream" : "text-ink/60 hover:text-ink");
  return (
    <div className="inline-flex rounded-full bg-surface p-1 shadow-soft ring-1 ring-ink/5">
      <button
        type="button"
        onClick={() => onChange("curated")}
        className={tabClass(source === "curated")}
        title="Hand-curated dataset (105 items)"
      >
        <Sprout className="h-3.5 w-3.5" />
        Curated
      </button>
      <button
        type="button"
        onClick={() => onChange("snapshot")}
        className={tabClass(source === "snapshot")}
        title="Frozen Wikidata snapshot bundled with the app"
      >
        <Archive className="h-3.5 w-3.5" />
        Snapshot
      </button>
      <button
        type="button"
        onClick={() => onChange("wikidata")}
        className={tabClass(source === "wikidata")}
        title="Live SPARQL query against the Wikidata endpoint"
      >
        <Database className="h-3.5 w-3.5" />
        Live
      </button>
    </div>
  );
}

function EmptyIllustration() {
  return (
    <svg
      width="84"
      height="84"
      viewBox="0 0 84 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="opacity-80"
    >
      <ellipse cx="42" cy="70" rx="28" ry="4" fill="#3F6B3A" fillOpacity="0.12" />
      <path
        d="M42 66V40"
        stroke="#3F6B3A"
        strokeOpacity="0.5"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M42 50C42 50 28 46 24 32C24 32 38 32 42 44"
        stroke="#3F6B3A"
        strokeOpacity="0.7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M42 50C42 50 56 46 60 32C60 32 46 32 42 44"
        stroke="#3F6B3A"
        strokeOpacity="0.7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M42 40C42 40 36 34 38 24C38 24 46 28 46 38"
        stroke="#3F6B3A"
        strokeOpacity="0.85"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="42" cy="22" r="3" fill="#3F6B3A" fillOpacity="0.6" />
    </svg>
  );
}

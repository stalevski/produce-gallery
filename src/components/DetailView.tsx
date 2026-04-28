import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, Loader2, Sparkles, X } from "lucide-react";
import type { Category, ProduceItem } from "../types";
import { fetchWikipediaSummary } from "../services/wikipedia";

interface DetailViewProps {
  item: ProduceItem | null;
  onClose: () => void;
  onSelectId?: (id: string) => void;
  itemsById?: Map<string, ProduceItem>;
}

const SEASON_LABEL: Record<string, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

const CATEGORY_LABEL: Record<Category, string> = {
  fruit: "Fruit",
  vegetable: "Vegetable",
  herb: "Herb",
  spice: "Spice",
  nut: "Nut",
  mushroom: "Mushroom",
  legume: "Legume",
  grain: "Grain",
  seed: "Seed",
};

const CATEGORY_DEFAULT_HEX: Record<Category, string> = {
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

export function DetailView({ item, onClose, onSelectId, itemsById }: DetailViewProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [wikiExtract, setWikiExtract] = useState<string | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);

  useEffect(() => {
    if (!item) return;
    setImgFailed(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [item, onClose]);

  useEffect(() => {
    if (!item) {
      setWikiExtract(null);
      setWikiLoading(false);
      return;
    }
    setWikiExtract(null);
    setWikiLoading(true);
    const ctrl = new AbortController();
    fetchWikipediaSummary(item.name, ctrl.signal)
      .then((res) => {
        if (res) setWikiExtract(res.extract);
      })
      .catch(() => {})
      .finally(() => setWikiLoading(false));
    return () => ctrl.abort();
  }, [item?.id, item?.name]);

  if (!item) return null;

  const accentHex = item.colorHex ?? CATEGORY_DEFAULT_HEX[item.category];
  const showImage = !!item.imageUrl && !imgFailed;
  const wikiUrl =
    item.url ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(item.name)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} details`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm dark:bg-black/70 sm:p-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-ink/5"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface/85 text-ink/60 ring-1 ring-ink/5 backdrop-blur-sm transition hover:bg-surface hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className="relative flex h-72 items-center justify-center overflow-hidden sm:h-80"
          style={{
            background: showImage
              ? "#f5efe4"
              : `linear-gradient(135deg, ${accentHex}22 0%, ${accentHex}66 100%)`,
          }}
        >
          {showImage ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[8rem] leading-none drop-shadow-sm">
              {item.emoji ?? "\u{1F33F}"}
            </span>
          )}
          {item.imageAttribution && showImage && (
            <div className="absolute bottom-2 right-2 max-w-[60%] truncate rounded-full bg-black/45 px-2.5 py-1 text-[10px] text-white/85 backdrop-blur-sm">
              {item.imageAttribution.author && (
                <span>© {item.imageAttribution.author}</span>
              )}
              {item.imageAttribution.license && (
                <span> · {item.imageAttribution.license}</span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <header>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                {item.name}
              </h2>
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-ink/70"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: accentHex }}
                />
                {CATEGORY_LABEL[item.category]}
              </span>
              {item.source === "wikidata" && (
                <span className="rounded-full bg-ink/5 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-ink/60">
                  Wikidata
                </span>
              )}
            </div>
            {(item.botanicalName || item.family) && (
              <p className="mt-1.5 text-sm text-ink/55">
                {item.botanicalName && (
                  <em className="italic">{item.botanicalName}</em>
                )}
                {item.botanicalName && item.family && (
                  <span className="text-ink/30"> · </span>
                )}
                {item.family && <span>{item.family}</span>}
              </p>
            )}
          </header>

          {item.description && (
            <p className="text-sm leading-relaxed text-ink/75">
              {item.description}
            </p>
          )}

          {(wikiLoading || wikiExtract) && (
            <div className="rounded-2xl border border-ink/5 bg-ink/[0.02] p-4">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink/50">
                <BookOpen className="h-3 w-3" />
                From Wikipedia
              </div>
              {wikiLoading && !wikiExtract ? (
                <div className="flex items-center gap-2 text-xs text-ink/40">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Fetching summary...
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-ink/70">{wikiExtract}</p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {item.origin && (
              <Meta label="Origin" value={item.origin} />
            )}
            {item.color && (
              <Meta label="Color" value={item.color} accentHex={accentHex} />
            )}
          </div>

          {item.seasons?.length ? (
            <Section title="Seasons">
              <div className="flex flex-wrap gap-1.5">
                {item.seasons.map((s) => (
                  <Chip key={s}>{SEASON_LABEL[s]}</Chip>
                ))}
              </div>
            </Section>
          ) : null}

          {item.pairings?.length ? (
            <Section title="Pairs well with">
              <div className="flex flex-wrap gap-1.5">
                {item.pairings.map((p) => {
                  const matched = itemsById?.get(p);
                  if (matched && onSelectId) {
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onSelectId(p)}
                        className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-cream transition hover:opacity-90"
                      >
                        {matched.name}
                      </button>
                    );
                  }
                  return <Chip key={p}>{p}</Chip>;
                })}
              </div>
            </Section>
          ) : null}

          {item.funFact && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-ink/[0.03] p-4">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ink/40" />
              <span className="text-sm leading-relaxed text-ink/75">
                {item.funFact}
              </span>
            </div>
          )}

          <a
            href={wikiUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink/50 transition hover:text-ink"
          >
            Read on Wikipedia <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

interface MetaProps {
  label: string;
  value: string;
  accentHex?: string;
}

function Meta({ label, value, accentHex }: MetaProps) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-ink/50">{label}</p>
      <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-ink/80">
        {accentHex && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: accentHex }}
          />
        )}
        {value}
      </p>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] uppercase tracking-wider text-ink/50">
        {title}
      </p>
      {children}
    </div>
  );
}

interface ChipProps {
  children: React.ReactNode;
}

function Chip({ children }: ChipProps) {
  return (
    <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-ink/70">
      {children}
    </span>
  );
}

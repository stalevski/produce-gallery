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

// Duration of the open/close transition. Kept short -- a modal that takes
// >250ms to dismiss starts feeling laggy, especially because the user has
// already decided to leave by the time it begins. The matching CSS classes
// below use Tailwind's duration-200 utility, which is the same value.
const TRANSITION_MS = 200;

export function DetailView({
  item: itemProp,
  onClose,
  onSelectId,
  itemsById,
}: DetailViewProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [wikiExtract, setWikiExtract] = useState<string | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);

  // Two-phase visibility so we can animate exit. The parent passes `itemProp`,
  // which can flip to null at any time; we keep the previous item around as
  // `displayItem` until the close transition has finished. `show` drives the
  // opacity/scale transition classes.
  const [displayItem, setDisplayItem] = useState<ProduceItem | null>(itemProp);
  const [show, setShow] = useState<boolean>(!!itemProp);

  useEffect(() => {
    if (itemProp) {
      // Opening: mount the item immediately, then on the next frame flip
      // `show` to true so the transition runs from the closed state.
      setDisplayItem(itemProp);
      const id = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(id);
    }
    // Closing: keep displayItem rendered while we fade out, then unmount.
    setShow(false);
    const t = setTimeout(() => setDisplayItem(null), TRANSITION_MS);
    return () => clearTimeout(t);
  }, [itemProp]);

  useEffect(() => {
    if (!displayItem) return;
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
  }, [displayItem, onClose]);

  useEffect(() => {
    if (!itemProp) {
      setWikiExtract(null);
      setWikiLoading(false);
      return;
    }
    setWikiExtract(null);
    setWikiLoading(true);
    const ctrl = new AbortController();
    fetchWikipediaSummary(itemProp.name, ctrl.signal)
      .then((res) => {
        if (res) setWikiExtract(res.extract);
      })
      .catch(() => {})
      .finally(() => setWikiLoading(false));
    return () => ctrl.abort();
  }, [itemProp?.id, itemProp?.name]);

  if (!displayItem) return null;

  // Alias the kept-around copy back to `item` so the rest of the JSX (which
  // is large) reads naturally without dozens of `displayItem.` references.
  const item = displayItem;

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
      className={
        "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 backdrop-blur-sm sm:p-8 " +
        "transition-opacity duration-200 ease-out " +
        (show
          ? "bg-black/40 dark:bg-black/70 opacity-100"
          : "bg-black/0 dark:bg-black/0 opacity-0 pointer-events-none")
      }
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          "relative w-full max-w-3xl overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-ink/5 " +
          "transition duration-200 ease-out " +
          (show
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-[0.97] translate-y-1")
        }
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface/85 text-ink/60 ring-1 ring-ink/5 backdrop-blur-sm transition hover:bg-surface hover:text-ink sm:h-9 sm:w-9"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          // max-h:45vh caps the image area to less than half the viewport so
          // landscape phones don't lose all the modal content below the fold.
          // On normal portrait phones / tablets / desktop the h-72/sm:h-80
          // wins because they have plenty of vertical room.
          className="group relative flex h-72 max-h-[45vh] items-center justify-center overflow-hidden sm:h-80"
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
            // Three composed motions on the emoji, separated by element so
            // they don't fight over `transform`:
            //   - outer span: continuous gentle float + tilt (idle)
            //   - inner span: one-shot entrance pop, plus hover scale/tilt
            // key={item.id} on the inner span so navigating to a related
            // item via the in-modal links re-fires the entrance.
            <span className="inline-block animate-emoji-float">
              <span
                key={item.id}
                className="block animate-emoji-pop text-[8rem] leading-none drop-shadow-sm transition-transform duration-300 ease-out group-hover:scale-[1.08] group-hover:-rotate-[4deg]"
              >
                {item.emoji ?? "\u{1F33F}"}
              </span>
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
            // -my-2 / py-2 expands the vertical hit area to ~32px on touch
            // devices without changing the line's effective layout.
            className="-my-2 inline-flex items-center gap-1.5 py-2 text-xs font-medium text-ink/50 transition hover:text-ink"
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

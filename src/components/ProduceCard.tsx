import { useState } from "react";
import { Sparkles, ExternalLink } from "lucide-react";
import type { Category, ProduceItem } from "../types";
import { HighlightedText } from "./HighlightedText";

interface ProduceCardProps {
  item: ProduceItem;
  onClick?: (item: ProduceItem) => void;
  query?: string;
}

const SEASON_LABEL: Record<string, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

const CATEGORY_EMOJI: Record<Category, string> = {
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

export function ProduceCard({ item, onClick, query }: ProduceCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const accentHex = item.colorHex ?? CATEGORY_DEFAULT_HEX[item.category];
  const showImage = !!item.imageUrl && !imgFailed;
  const fallbackEmoji = item.emoji ?? CATEGORY_EMOJI[item.category];
  const clickable = !!onClick;

  const handleClick = () => onClick?.(item);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(item);
    }
  };

  return (
    <article
      onClick={clickable ? handleClick : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `View details for ${item.name}` : undefined}
      className={
        "group relative flex flex-col overflow-hidden rounded-3xl bg-surface/70 backdrop-blur-sm shadow-soft ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(20,30,20,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 " +
        (clickable ? "cursor-pointer" : "")
      }
    >
      <div
        className="relative flex h-44 items-center justify-center overflow-hidden"
        style={{
          background: showImage
            ? "#f5efe4"
            : `linear-gradient(135deg, ${accentHex}22 0%, ${accentHex}55 100%)`,
        }}
      >
        {showImage ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span
            aria-hidden
            className="text-[6.5rem] leading-none drop-shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-4deg]"
          >
            {fallbackEmoji}
          </span>
        )}
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-surface/85 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-ink/70 ring-1 ring-black/5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: accentHex }}
          />
          {item.category}
        </span>
        {item.source === "wikidata" && (
          <span className="absolute right-4 top-4 rounded-full bg-surface/85 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-ink/60 ring-1 ring-black/5">
            Wikidata
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-2xl font-semibold leading-tight text-ink">
            <HighlightedText text={item.name} query={query} />
          </h3>
          {item.color && (
            <span className="text-xs uppercase tracking-wider text-ink/50">
              {item.color}
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-sm leading-relaxed text-ink/70 line-clamp-4">
            <HighlightedText text={item.description} query={query} />
          </p>
        )}

        {(item.seasons?.length || item.origin) && (
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
            {item.seasons?.map((s) => (
              <span
                key={s}
                className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-medium text-ink/70"
              >
                {SEASON_LABEL[s]}
              </span>
            ))}
            {item.origin && (
              <span className="ml-auto text-[11px] text-ink/40">{item.origin}</span>
            )}
          </div>
        )}

        {item.funFact && (
          <div className="mt-1 flex items-start gap-2 rounded-2xl bg-ink/[0.03] p-3 text-[12.5px] leading-snug text-ink/70">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/40" />
            <span>{item.funFact}</span>
          </div>
        )}

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => e.stopPropagation()}
            className="mt-auto inline-flex items-center gap-1 self-start text-xs font-medium text-ink/50 transition hover:text-ink"
          >
            Wikipedia <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}

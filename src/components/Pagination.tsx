import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export type PageSize = 25 | 50 | 100 | 200 | "all";

export const PAGE_SIZE_OPTIONS: PageSize[] = [25, 50, 100, 200, "all"];

interface PaginationProps {
  page: number;
  pageSize: PageSize;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const isAll = pageSize === "all";
  const effectiveSize = isAll ? Math.max(totalCount, 1) : pageSize;
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalCount / effectiveSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = totalCount === 0 ? 0 : safePage * effectiveSize + 1;
  const end = Math.min(totalCount, (safePage + 1) * effectiveSize);

  const goFirst = () => onPageChange(0);
  const goPrev = () => onPageChange(Math.max(0, safePage - 1));
  const goNext = () => onPageChange(Math.min(totalPages - 1, safePage + 1));
  const goLast = () => onPageChange(totalPages - 1);

  const canPrev = safePage > 0;
  const canNext = safePage < totalPages - 1;

  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-surface/60 px-5 py-4 ring-1 ring-ink/5 backdrop-blur-sm shadow-soft sm:flex-row">
      <div className="flex items-center gap-3 text-xs text-ink/60">
        <label className="flex items-center gap-2">
          <span className="uppercase tracking-wider">Show</span>
          <select
            value={String(pageSize)}
            onChange={(e) => {
              const v = e.target.value;
              onPageSizeChange(v === "all" ? "all" : (Number(v) as PageSize));
              onPageChange(0);
            }}
            className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink/80 ring-1 ring-ink/5 outline-none transition focus:ring-2 focus:ring-ink/30"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={String(opt)} value={String(opt)}>
                {opt === "all" ? "All" : opt}
              </option>
            ))}
          </select>
          <span className="uppercase tracking-wider">per page</span>
        </label>
      </div>

      <div className="text-xs text-ink/60">
        {totalCount === 0 ? (
          <span>No results</span>
        ) : (
          <span>
            Showing <span className="font-medium text-ink">{start}</span>
            <span className="text-ink/40"> – </span>
            <span className="font-medium text-ink">{end}</span> of{" "}
            <span className="font-medium text-ink">{totalCount}</span>
          </span>
        )}
      </div>

      {!isAll && totalPages > 1 && (
        <div className="flex items-center gap-1">
          <PageButton onClick={goFirst} disabled={!canPrev} label="First page">
            <ChevronsLeft className="h-3.5 w-3.5" />
          </PageButton>
          <PageButton onClick={goPrev} disabled={!canPrev} label="Previous page">
            <ChevronLeft className="h-3.5 w-3.5" />
          </PageButton>
          <span className="px-2 text-xs text-ink/60">
            <span className="font-medium text-ink">{safePage + 1}</span>
            <span className="text-ink/40"> / </span>
            {totalPages}
          </span>
          <PageButton onClick={goNext} disabled={!canNext} label="Next page">
            <ChevronRight className="h-3.5 w-3.5" />
          </PageButton>
          <PageButton onClick={goLast} disabled={!canNext} label="Last page">
            <ChevronsRight className="h-3.5 w-3.5" />
          </PageButton>
        </div>
      )}
    </div>
  );
}

interface PageButtonProps {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}

function PageButton({ onClick, disabled, label, children }: PageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      // h-9 w-9 (36px) on mobile so the 4 nav buttons are reasonable tap
      // targets even when packed tightly in a row. sm:h-7 sm:w-7 keeps the
      // tighter desktop look unchanged.
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink/70 ring-1 ring-ink/5 transition hover:bg-ink/5 hover:text-ink disabled:opacity-40 disabled:hover:bg-surface disabled:hover:text-ink/70 sm:h-7 sm:w-7"
    >
      {children}
    </button>
  );
}

export function paginate<T>(items: T[], page: number, pageSize: PageSize): T[] {
  if (pageSize === "all") return items;
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

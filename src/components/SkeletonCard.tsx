interface SkeletonGridProps {
  count?: number;
}

export function SkeletonGrid({ count = 8 }: SkeletonGridProps) {
  return (
    <section
      aria-busy="true"
      aria-label="Loading produce"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </section>
  );
}

function SkeletonCard() {
  return (
    <article className="flex animate-pulse flex-col overflow-hidden rounded-3xl bg-surface/70 ring-1 ring-black/5 shadow-soft">
      <div className="h-44 bg-ink/[0.05]" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="h-6 w-2/3 rounded-full bg-ink/[0.06]" />
          <div className="h-3 w-12 rounded-full bg-ink/[0.06]" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded-full bg-ink/[0.05]" />
          <div className="h-3 w-5/6 rounded-full bg-ink/[0.05]" />
          <div className="h-3 w-4/6 rounded-full bg-ink/[0.05]" />
        </div>
        <div className="mt-auto flex gap-1.5 pt-2">
          <div className="h-5 w-14 rounded-full bg-ink/[0.05]" />
          <div className="h-5 w-14 rounded-full bg-ink/[0.05]" />
        </div>
      </div>
    </article>
  );
}

/**
 * The Atlas's own shape while it loads.
 *
 * The shared <ListSkeleton> stands in for a document — a centred column of
 * cards — so using it here flashed the wrong layout before the right one. This
 * is the panel and the map field, at the widths they settle into, so the page
 * does not jump when the real thing arrives.
 */
export default function Loading() {
  return (
    <div
      aria-busy="true"
      className="flex h-dvh w-full flex-col-reverse overflow-hidden lg:flex-row"
    >
      <span className="sr-only">Memuat peta…</span>

      <div className="flex h-[55dvh] shrink-0 flex-col gap-4 border-t border-border bg-card p-4 lg:h-full lg:w-[22rem] lg:border-t-0 lg:border-r xl:w-96">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="h-24 animate-pulse rounded bg-muted" />
      </div>

      <div className="min-h-0 flex-1 animate-pulse bg-[#edf1ee]" />
    </div>
  )
}

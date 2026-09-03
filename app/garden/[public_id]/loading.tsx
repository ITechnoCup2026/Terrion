/**
 * The garden's own shape while it loads.
 *
 * The same two-column frame the page settles into -- panel beside canvas, and
 * stacked below `lg` -- so nothing jumps when the real thing arrives. It used
 * to render a document skeleton, which was the right shape for the page this
 * one no longer is.
 */
export default function Loading() {
  return (
    <div
      aria-busy="true"
      className="flex h-dvh w-full flex-col-reverse overflow-hidden lg:flex-row"
    >
      <span className="sr-only">Memuat kebun…</span>

      <div className="flex h-[50dvh] shrink-0 flex-col gap-4 border-t border-border bg-card p-4 lg:h-full lg:w-[22rem] lg:border-t-0 lg:border-r xl:w-96">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="h-24 animate-pulse rounded bg-muted" />
      </div>

      <div className="min-h-0 flex-1 animate-pulse bg-muted" />
    </div>
  )
}

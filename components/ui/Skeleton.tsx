import { cn } from '@/lib/utils'

/**
 * A placeholder block for content that is still loading.
 *
 * The projection behind the dashboard, the catalogue and the plot list takes
 * seconds -- it re-simulates growing degree days for every block. Without
 * something on screen the page reads as broken, and a reader on a weak
 * connection cannot tell waiting from failure.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-muted', className)} />
}

const WIDTHS = {
  form: 'max-w-xl',
  doc: 'max-w-3xl',
  wide: 'max-w-6xl',
} as const

/**
 * The shape of a page that has not arrived yet.
 *
 * Every route used to render the same 3xl column of four stacked bars,
 * including the two 6xl grid pages. So the dashboard and the catalogue drew a
 * narrow list, then replaced it with a wide grid -- the skeleton was itself
 * the layout shift it exists to prevent. It now takes the same container,
 * rhythm and figure row as <Page> + <PageHeader> + <MetricRow>, and the caller
 * says which of the two shapes below it is standing in for.
 *
 *   list  a column of cards -- purchases, requests, the plot detail
 *   grid  a responsive card grid -- the catalogue, the plot browser
 */
export function ListSkeleton({
  rows = 4,
  width = 'doc',
  metrics = false,
  variant = 'list',
}: {
  rows?: number
  width?: keyof typeof WIDTHS
  /** Draw the four-figure row these pages open with. */
  metrics?: boolean
  variant?: 'list' | 'grid'
}) {
  return (
    <div
      aria-busy="true"
      className={cn(
        'mx-auto flex w-full flex-col gap-6 px-4 py-6 sm:py-8',
        WIDTHS[width],
      )}
    >
      <span className="sr-only">Memuat…</span>

      {/* The title block: one line at heading size, one at body size. */}
      <div>
        <Skeleton className="h-7 w-44" />
        <Skeleton className="mt-2.5 h-4 w-72 max-w-full" />
      </div>

      {metrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[3.75rem] rounded-xl" />
          ))}
        </div>
      )}

      <div
        className={cn(
          'grid gap-4',
          variant === 'grid'
            ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'gap-3',
        )}
      >
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton
            key={i}
            className={cn('w-full rounded-xl', variant === 'grid' ? 'h-64' : 'h-28')}
          />
        ))}
      </div>
    </div>
  )
}

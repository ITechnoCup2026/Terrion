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

/** The shape most of these screens share: a heading, then a list of cards. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6" aria-busy="true">
      <span className="sr-only">Memuat…</span>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-6 grid gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </div>
  )
}

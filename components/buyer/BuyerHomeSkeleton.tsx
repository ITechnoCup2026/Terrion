import { Page } from '@/components/ui/Page'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Skeleton loader for Buyer Home matching the cooperative 2-column ERP layout.
 */
export function BuyerHomeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* 4 Metric Cards Skeleton (MetricRow) */}
      <div
        aria-hidden
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="panel flex flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-28 bg-border/70" />
              <Skeleton className="size-7 rounded-lg bg-border/70" />
            </div>
            <Skeleton className="mt-3.5 h-8 w-16 bg-border/70" />
            <Skeleton className="mt-2 h-3 w-32 bg-border/70" />
          </div>
        ))}
      </div>

      {/* 2-Column ERP Panels Skeleton */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left Column: Recent Requests Skeleton */}
        <div className="panel flex flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 border-b border-border/80 pb-4">
            <div className="flex min-w-0 items-start gap-3">
              <Skeleton className="mt-0.5 size-8 shrink-0 rounded-lg" />
              <div className="min-w-0">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="mt-1.5 h-3 w-56 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>

          <div className="mt-1 flex flex-col divide-y divide-border/60">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-1.5 h-3 w-48 max-w-full" />
                </div>
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-border/80 pt-3.5">
            <Skeleton className="h-3.5 w-40" />
          </div>
        </div>

        {/* Right Column: Available Harvest Supply Skeleton */}
        <div className="panel flex flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 border-b border-border/80 pb-4">
            <div className="flex min-w-0 items-start gap-3">
              <Skeleton className="mt-0.5 size-8 shrink-0 rounded-lg" />
              <div className="min-w-0">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="mt-1.5 h-3 w-56 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>

          <div className="mt-1 flex flex-col divide-y divide-border/60">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-1.5 h-3 w-48 max-w-full" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-border/80 pt-3.5">
            <Skeleton className="h-3.5 w-48" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Full page skeleton including PageHeader
 */
export function BuyerHomePageSkeleton() {
  return (
    <Page className="flex max-w-7xl flex-col gap-6">
      <span className="sr-only" role="status">Memuat beranda…</span>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div>
          <Skeleton className="h-7 w-56" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-8.5 w-32 rounded-lg" />
          <Skeleton className="h-8.5 w-32 rounded-lg" />
        </div>
      </div>
      <BuyerHomeSkeleton />
    </Page>
  )
}

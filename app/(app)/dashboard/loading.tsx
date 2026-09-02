import { Page } from '@/components/ui/Page'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * The dashboard's own shape while its projection is still being computed.
 *
 * It used to borrow <ListSkeleton>'s four-figure row and column of cards,
 * which is the shape of the plot list, not of this page — so the load drew a
 * ledger and a list and then replaced them with one large panel. A skeleton
 * that does not match the page is the layout shift it exists to prevent.
 */
export default function Loading() {
  return (
    <Page width="wide" className="flex flex-col gap-4">
      <span aria-busy="true" className="sr-only">Memuat…</span>

      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2.5 h-4 w-80 max-w-full" />
      </div>

      <Skeleton className="h-[26rem] rounded-xl lg:h-[24rem]" />
      <Skeleton className="h-24 rounded-lg" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </Page>
  )
}

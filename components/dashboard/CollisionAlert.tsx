import { ApplyStaggerButton } from '@/components/dashboard/ApplyStaggerButton'
import { collisionBasis, collisionHeadline, staggerSentence } from '@/lib/dashboard/copy'
import { cn } from '@/lib/utils'

/**
 * The pile-up warning — the screen Flow B exists for.
 *
 * Three things it must always do. Name the basis it judged against, so the
 * claim is auditable rather than an oracle. Offer a concrete change, not
 * "consider staggering". And list the plots behind the number, because a
 * board that cannot see which members are affected cannot act on it.
 *
 * A server component: everything here is computed upstream, and <details>
 * gives the expand/collapse without shipping JavaScript for it.
 */

export type CollisionAlertData = {
  /** Identifies which suggestion the accept button is answering. */
  isoWeek: string
  commodityId: string
  weekStart: Date
  commodityName: string
  tonnes: number
  basis: 'capacity' | 'median'
  threshold: number
  plotCount: number
  totalPlots: number
  contributingPlots: { id: string; name: string; memberName: string }[]
  suggestion: { blockIds: string[]; shiftDays: number; tonnesMoved: number } | null
}

export function CollisionAlert({
  data,
  className,
}: {
  data: CollisionAlertData
  className?: string
}) {
  const percentOver = Math.round((data.tonnes / data.threshold) * 100)

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-background p-4 sm:p-5 shadow-sm transition-all duration-200 card-lift',
        className,
      )}
      aria-labelledby="collision-heading"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-amber-500" />
      <div className="flex items-start gap-3.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-lg">
          ⚠️
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Peringatan Kapasitas Panen · {data.commodityName}
            </p>
            <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
              {percentOver}% dari kapasitas
            </span>
          </div>

          <h2 id="collision-heading" className="mt-1 text-base font-bold tracking-tight text-foreground">
            {collisionHeadline({
              plotCount: data.plotCount,
              totalPlots: data.totalPlots,
              weekStart: data.weekStart,
              tonnes: data.tonnes,
            })}
          </h2>

          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Itu {collisionBasis({ basis: data.basis, threshold: data.threshold, tonnes: data.tonnes })}.
          </p>

          {/* Visual Progress Bar Meter */}
          <div className="mt-3 max-w-md">
            <div className="flex justify-between text-[0.7rem] font-medium text-muted-foreground mb-1">
              <span>Perkiraan: {data.tonnes} ton</span>
              <span>Batas: {data.threshold} ton</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-amber-500/20">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${Math.min(percentOver, 100)}%` }}
              />
            </div>
          </div>

          {data.suggestion && (
            <div className="mt-3.5 rounded-lg border border-amber-500/30 bg-background/85 p-3 backdrop-blur-xs">
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                💡 Rekomendasi Penjadwalan Ulang:
              </p>
              <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                {staggerSentence(data.suggestion)}
              </p>
              <div className="mt-2.5">
                <ApplyStaggerButton isoWeek={data.isoWeek} commodityId={data.commodityId} />
              </div>
            </div>
          )}

          {data.contributingPlots.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground">
                Lihat {data.contributingPlots.length} lahan penyumbang
              </summary>
              <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
                {data.contributingPlots.map(plot => (
                  <li key={plot.id} className="flex justify-between gap-3 px-3 py-2 text-xs">
                    <span className="font-medium text-foreground">{plot.name}</span>
                    <span className="text-muted-foreground">{plot.memberName}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </section>
  )
}

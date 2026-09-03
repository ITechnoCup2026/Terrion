import { ApplyStaggerButton } from '@/components/dashboard/ApplyStaggerButton'
import { collisionBasis, collisionHeadline, staggerSentence } from '@/lib/dashboard/copy'
import { formatNumberId } from '@/lib/format/number'
import { cn } from '@/lib/utils'

export type CollisionAlertData = {
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
  return (
    <section
      aria-labelledby="collision-heading"
      className={cn(
        'rounded-lg border border-border border-l-[3px] border-l-accent bg-card px-5 py-4 shadow-[var(--shadow-xs)]',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1 basis-80">
          <h2
            id="collision-heading"
            className="max-w-2xl text-[0.9375rem] leading-snug font-medium text-foreground"
          >
            {collisionHeadline({
              plotCount: data.plotCount,
              totalPlots: data.totalPlots,
              weekStart: data.weekStart,
              tonnes: data.tonnes,
            })}
          </h2>

          <p className="mt-1.5 max-w-2xl text-[0.8125rem] leading-relaxed text-muted-foreground">
            {data.commodityName},{' '}
            {collisionBasis({ basis: data.basis, threshold: data.threshold, tonnes: data.tonnes })}.
          </p>

          {data.suggestion && (
            <p className="mt-2.5 max-w-2xl text-[0.8125rem] leading-relaxed text-foreground font-medium">
              {staggerSentence(data.suggestion)}
            </p>
          )}
        </div>

        {data.suggestion && (
          <div className="shrink-0">
            <ApplyStaggerButton isoWeek={data.isoWeek} commodityId={data.commodityId} />
          </div>
        )}
      </div>

      {data.contributingPlots.length > 0 && (
        <details className="mt-4 border-t border-border pt-3">
          <summary className="interactive cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Lihat {data.contributingPlots.length} lahan penyumbang
          </summary>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {data.contributingPlots.map(plot => (
              <li key={plot.id} className="flex justify-between gap-3 px-3 py-2 text-xs">
                <span className="text-foreground">{plot.name}</span>
                <span className="text-muted-foreground">{plot.memberName}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

export function CollisionClear({
  peakTonnes,
  className,
}: {
  peakTonnes: number | null
  className?: string
}) {
  return null
}





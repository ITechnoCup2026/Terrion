import { ApplyStaggerButton } from '@/components/dashboard/ApplyStaggerButton'
import { Card } from '@/components/ui/Card'
import { collisionBasis, collisionHeadline, staggerSentence } from '@/lib/dashboard/copy'
import { formatNumberId } from '@/lib/format/number'
import { cn } from '@/lib/utils'

/**
 * The pile-up warning — the screen Flow B exists for.
 *
 * Three things it must always do. Name the basis it judged against, so the
 * claim is auditable rather than an oracle. Offer a concrete change, not
 * "consider staggering". And list the plots behind the number, because a board
 * that cannot see which members are affected cannot act on it.
 *
 * It is the one panel on the dashboard that is allowed to be gold, and it uses
 * that budget once: the gold rule around the card and the gold in the meter,
 * both saying the same thing. It previously carried a gradient wash, a solid
 * bar down its left edge, an emoji in a tinted chip, a tracked-out capitalised
 * label, a percentage pill and a second emoji inside the recommendation — six
 * devices competing to be the thing you noticed, on a panel whose entire job
 * is to be noticed once and then read.
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
    <Card
      as="section"
      tone="alert"
      pad="lg"
      className={className}
      aria-labelledby="collision-heading"
    >
      <p className="text-xs text-accent">
        Melewati kapasitas · {data.commodityName}
      </p>

      <h2
        id="collision-heading"
        className="mt-2 max-w-2xl text-base leading-snug font-medium text-foreground"
      >
        {collisionHeadline({
          plotCount: data.plotCount,
          totalPlots: data.totalPlots,
          weekStart: data.weekStart,
          tonnes: data.tonnes,
        })}
      </h2>

      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Itu {collisionBasis({ basis: data.basis, threshold: data.threshold, tonnes: data.tonnes })}.
      </p>

      {/* The meter. It reads past its own track when the week is over
          capacity, which is the point: a bar that stops neatly at 100% draws
          an overflow as if it were exactly full. */}
      <div className="mt-5 max-w-md">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">
            Perkiraan{' '}
            <span className="tabular-nums text-accent">
              {formatNumberId(data.tonnes)} ton
            </span>
          </span>
          <span className="text-muted-foreground">
            Batas <span className="tabular-nums">{formatNumberId(data.threshold)} ton</span>
          </span>
        </div>

        <div className="relative mt-2 h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.min(percentOver, 100)}%` }}
          />
          <span
            aria-hidden
            className="absolute inset-y-[-3px] w-px bg-[var(--terrion-ink-faint)]"
            style={{ left: `${Math.min(10000 / percentOver, 100)}%` }}
          />
        </div>

        <p className="mt-1.5 text-[0.6875rem] tabular-nums text-[var(--terrion-ink-faint)]">
          {percentOver}% dari kapasitas koperasi
        </p>
      </div>

      {data.suggestion && (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-sm font-medium text-foreground">Saran pergeseran</p>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {staggerSentence(data.suggestion)}
          </p>
          <div className="mt-3">
            <ApplyStaggerButton isoWeek={data.isoWeek} commodityId={data.commodityId} />
          </div>
        </div>
      )}

      {data.contributingPlots.length > 0 && (
        <details className="mt-5 border-t border-border pt-4">
          <summary className="interactive cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Lihat {data.contributingPlots.length} lahan penyumbang
          </summary>
          <ul className={cn('mt-3 divide-y divide-border rounded-lg border border-border')}>
            {data.contributingPlots.map(plot => (
              <li key={plot.id} className="flex justify-between gap-3 px-3 py-2 text-xs">
                <span className="text-foreground">{plot.name}</span>
                <span className="text-muted-foreground">{plot.memberName}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  )
}

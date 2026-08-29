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
  return (
    <section
      className={cn(
        'rounded-lg border border-destructive/40 bg-destructive/5 p-4',
        className,
      )}
      aria-labelledby="collision-heading"
    >
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-destructive">
          ⚠
        </span>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
            Penumpukan panen · {data.commodityName}
          </p>

          <h2 id="collision-heading" className="mt-1 text-sm font-medium text-foreground">
            {collisionHeadline({
              plotCount: data.plotCount,
              totalPlots: data.totalPlots,
              weekStart: data.weekStart,
              tonnes: data.tonnes,
            })}
          </h2>

          {/* Spec D2: never "too much" without saying too much against what. */}
          <p className="mt-1 text-sm text-muted-foreground">
            Itu {collisionBasis({ basis: data.basis, threshold: data.threshold, tonnes: data.tonnes })}.
          </p>

          {/* The sentence and the button are siblings, not nested. They were
              written as an <ApplyStaggerButton> INSIDE the <p> holding the
              sentence, which is invalid HTML: the browser hoists the button
              out during parsing, so the server's markup and the client's tree
              disagreed and every dashboard render failed hydration and
              re-rendered the whole page on the client. */}
          {data.suggestion && (
            <div className="mt-2">
              <p className="text-sm font-medium text-foreground">
                {staggerSentence(data.suggestion)}
              </p>
              <ApplyStaggerButton isoWeek={data.isoWeek} commodityId={data.commodityId} />
            </div>
          )}

          {data.contributingPlots.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
                Lihat {data.contributingPlots.length} lahan penyumbang
              </summary>
              <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-card">
                {data.contributingPlots.map(plot => (
                  <li key={plot.id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-foreground">{plot.name}</span>
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

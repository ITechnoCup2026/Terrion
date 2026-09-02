import { ApplyStaggerButton } from '@/components/dashboard/ApplyStaggerButton'
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
 * What it no longer does is draw its own meter. It used to carry a bar showing
 * the estimate against the cap, directly beneath a chart of the same tonnage —
 * the same fact twice, in two shapes, and the reader had to work out they were
 * the same fact. The projection above owns the picture now; this owns the
 * sentence and the button, and it is the only gold rule on the page.
 *
 * A server component: everything here is computed upstream, and <details>
 * gives the expand and collapse without shipping JavaScript for it.
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
      aria-labelledby="collision-heading"
      className={cn(
        // A left edge rather than a full border: this sits directly under the
        // projection, and a second complete rectangle there reads as a second
        // panel of equal weight instead of a note attached to the first.
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

          {/* The tonnage in the headline is this commodity's, not the week's,
              so the crop names the figure rather than making a second claim
              about everything else ripening that week. */}
          <p className="mt-1.5 max-w-2xl text-[0.8125rem] leading-relaxed text-muted-foreground">
            {data.commodityName},{' '}
            {collisionBasis({ basis: data.basis, threshold: data.threshold, tonnes: data.tonnes })}.
          </p>

          {data.suggestion && (
            <p className="mt-2.5 max-w-2xl text-[0.8125rem] leading-relaxed text-foreground">
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

/**
 * The other outcome, drawn as an outcome.
 *
 * A cooperative whose season is evenly spread used to be told so in one line
 * of grey text — the quietest element on the page, as the reward for the thing
 * the page exists to help them achieve. It carries a figure now, because
 * "nothing is over capacity" is worth more when it comes with the headroom it
 * was measured against.
 */
export function CollisionClear({
  peakTonnes,
  className,
}: {
  peakTonnes: number | null
  className?: string
}) {
  return (
    <p
      className={cn(
        'flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border border-border border-l-[3px] border-l-[var(--terrion-green-500)] bg-card px-5 py-4 text-[0.8125rem] shadow-[var(--shadow-xs)]',
        className,
      )}
    >
      <span className="font-medium text-[var(--terrion-green-700)]">
        Tidak ada penumpukan panen
      </span>
      <span className="text-muted-foreground">
        {peakTonnes === null
          ? 'Belum ada minggu yang melewati kapasitas koperasi dalam 12 minggu ke depan.'
          : `Minggu terpadat tetap di ${formatNumberId(peakTonnes)} ton, masih di bawah kapasitas koperasi.`}
      </span>
    </p>
  )
}

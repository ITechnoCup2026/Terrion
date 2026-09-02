import { ProjectionChart, type ChartWeek } from '@/components/dashboard/ProjectionChart'
import { formatNumberId } from '@/lib/format/number'
import { formatHarvestRange } from '@/lib/harvest/format'
import { cn } from '@/lib/utils'

/**
 * The page's subject, in one object.
 *
 * The dashboard used to open with a four-cell ledger of totals, then put the
 * projection in a card two thirds of the way down a three-column grid. That
 * order is backwards: a total is a summary of the picture, and the picture is
 * the only thing on this screen a board cannot reconstruct in its head. So the
 * figures moved *inside* the chart's panel, down its left edge, where they
 * read as captions on the thing they describe rather than as four unrelated
 * measurements that happen to be adjacent.
 *
 * The peak week is the headline because it is the actionable one. "83,4 tonnes
 * over twelve weeks" is a fact about the season; "14,2 tonnes in the week of
 * 1 November" is a fact somebody has to do something about this month.
 */

const WEEK_MS = 7 * 86_400_000

export type ProjectionPanelProps = {
  weeks: ChartWeek[]
  totalTonnes: number
  peak: { tonnes: number; min: number; max: number; weekStart: Date } | null
  flaggedCount: number
  plotCount: number
  /** The pile-up the peak belongs to, when there is one. */
  overCapacity: { commodityName: string; percentOfCapacity: number } | null
}

export function ProjectionPanel({
  weeks, totalTonnes, peak, flaggedCount, plotCount, overCapacity,
}: ProjectionPanelProps) {
  const ledger = [
    { label: 'Panen 12 minggu', value: `${formatNumberId(totalTonnes)} t` },
    {
      label: 'Minggu padat',
      value: formatNumberId(flaggedCount),
      tone: flaggedCount > 0 ? 'accent' as const : undefined,
    },
    { label: 'Lahan terdaftar', value: formatNumberId(plotCount) },
  ]

  return (
    <section
      aria-labelledby="projection-heading"
      className="grid overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-md)] lg:grid-cols-[16rem_minmax(0,1fr)]"
    >
      {/* The caption column. Ruled, not boxed: it is part of the chart's
          statement, not a second panel beside it. */}
      <div className="flex flex-col border-b border-border p-5 lg:border-r lg:border-b-0 lg:p-6">
        <div>
          <p className="text-[0.6875rem] text-muted-foreground">Puncak panen</p>

          {peak ? (
            <>
              <p className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={cn(
                    'text-[2.75rem] leading-[0.9] font-semibold tracking-[-0.02em] tabular-nums',
                    overCapacity ? 'text-accent' : 'text-foreground',
                  )}
                >
                  {formatNumberId(peak.tonnes)}
                </span>
                <span className="text-sm text-muted-foreground">ton</span>
              </p>
              {/* The headline figure states its own interval, because every
                  other tonnage in this product does. A single number at 44px
                  is the loudest place on the page to imply a precision the
                  model has not got. */}
              <p className="mt-2 text-[0.75rem] tabular-nums text-muted-foreground">
                rentang {formatNumberId(peak.min)}–{formatNumberId(peak.max)} ton
              </p>
              <p className="mt-3 border-t border-border pt-3 text-[0.8125rem] text-foreground">
                minggu {formatHarvestRange(peak.weekStart, new Date(+peak.weekStart + WEEK_MS - 86_400_000))}
              </p>
              {overCapacity && (
                <p className="mt-1 text-[0.75rem] text-accent">
                  {overCapacity.percentOfCapacity}% dari kapasitas {overCapacity.commodityName.toLowerCase()}
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-[0.8125rem] text-muted-foreground">
              Belum ada proyeksi untuk musim ini.
            </p>
          )}
        </div>

        <dl className="mt-7 flex flex-col lg:mt-auto lg:pt-7">
          {ledger.map(row => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3 border-t border-border py-2 last:pb-0"
            >
              <dt className="text-[0.75rem] text-muted-foreground">{row.label}</dt>
              <dd
                className={cn(
                  'text-[0.9375rem] font-medium tabular-nums',
                  row.tone === 'accent' ? 'text-accent' : 'text-foreground',
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex min-w-0 flex-col p-5 lg:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h2 id="projection-heading" className="text-sm font-semibold text-foreground">
              Proyeksi panen mingguan
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Setiap minggu adalah rentang, bukan satu angka.
            </p>
          </div>
          <Legend />
        </div>

        <ProjectionChart weeks={weeks} />
      </div>
    </section>
  )
}

/**
 * The capsule needs saying once. A reader who has met a bar chart has not
 * necessarily met an interval, and the difference between the pale part and
 * the dark line is the difference between "might" and "expected".
 */
function Legend() {
  return (
    <ul className="flex shrink-0 items-center gap-4">
      <li className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
        <span aria-hidden className="relative block h-4 w-2 rounded-full bg-[var(--terrion-green-200)]">
          <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--terrion-green-600)]" />
        </span>
        perkiraan dan rentangnya
      </li>
      <li className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
        <span aria-hidden className="block h-4 w-2 rounded-full bg-accent" />
        melewati kapasitas
      </li>
    </ul>
  )
}

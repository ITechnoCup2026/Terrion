import { formatHarvestRange, MONTHS_ID } from '@/lib/harvest/format'
import { cn } from '@/lib/utils'

export type GanttRow = {
  id: string
  label: string
  commodityName: string
  color: string
  window: { start: Date; end: Date } | null
}

const MS_DAY = 86_400_000

/**
 * Every block's harvest window on one shared axis.
 *
 * A list of ranges tells a reader when each block comes out; only putting them
 * on a common axis tells them what they came to find out, which is whether the
 * blocks land together or spread across the season. That is the question
 * staggering exists to answer, and the public page had no way to ask it.
 *
 * The bars are ranges, so no date is ever drawn as a point — the same rule
 * HarvestWindow enforces in text, enforced here in geometry. A block with no
 * window gets a row and no bar rather than being dropped: a reader counting
 * blocks against the diagram must find the same number in both.
 */
export function HarvestGantt({
  rows, className,
}: {
  rows: readonly GanttRow[]
  className?: string
}) {
  const dated = rows.filter(r => r.window !== null)
  if (dated.length === 0) return null

  const from = Math.min(...dated.map(r => r.window!.start.getTime()))
  const to = Math.max(...dated.map(r => r.window!.end.getTime()))
  // A single one-day window would otherwise divide by zero. Widening to a week
  // keeps the bar visible without moving either end of it.
  const span = Math.max(to - from, 7 * MS_DAY)

  const pct = (t: number) => ((t - from) / span) * 100

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <ol className="flex list-none flex-col gap-2">
        {rows.map(r => (
          <li key={r.id} className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {r.commodityName}
              </p>
              <p className="truncate text-[0.7rem] text-muted-foreground">{r.label}</p>
            </div>

            {r.window ? (
              <div className="relative h-6 rounded-md bg-muted">
                <div
                  className="absolute inset-y-0 flex min-w-1.5 items-center justify-center rounded-md px-1.5"
                  style={{
                    left: `${pct(r.window.start.getTime())}%`,
                    width: `${Math.max(pct(r.window.end.getTime()) - pct(r.window.start.getTime()), 1.5)}%`,
                    backgroundColor: r.color,
                  }}
                >
                  <span className="sr-only">
                    {formatHarvestRange(r.window.start, r.window.end)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Perkiraan belum tersedia</p>
            )}
          </li>
        ))}
      </ol>

      {/* The axis reads as two dates rather than a ruler of ticks. At this
          width a tick per month is four labels fighting for forty pixels on a
          phone, and the bars are for comparing blocks to each other, not for
          reading a date off — the exact range is in the table below. */}
      <div className="grid grid-cols-[7.5rem_1fr] gap-3">
        <span />
        <div className="flex justify-between text-[0.7rem] text-muted-foreground">
          <span>{monthDay(new Date(from))}</span>
          <span>{monthDay(new Date(to))}</span>
        </div>
      </div>
    </div>
  )
}

// UTC, like every other date in the app: formatting locally would show a
// reader in WIB the previous day.
function monthDay(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]}`
}

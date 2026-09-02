import type { CSSProperties } from 'react'

import { EmptyState } from '@/components/ui/EmptyState'
import { formatNumberId } from '@/lib/format/number'
import { MONTHS_ID } from '@/lib/harvest/format'
import { cn } from '@/lib/utils'

/**
 * Twelve weeks of projected tonnage, drawn as ranges rather than as bars.
 *
 * A harvest window spanning several days does not commit its tonnage to one
 * week, so every week here is an interval: the capsule runs from "certain to
 * land in this week" to "could all land in this week", and the crossbar is the
 * even-spread estimate inside it. That interval is the one claim Terrion makes
 * which a planting-date calculator cannot — the product refuses to name a day
 * anywhere else, and this is the same refusal drawn.
 *
 * It used to be a solid bar with the range behind it as a pale filled
 * mountain. The mountain read as a gradient wash, and the bars read as certain
 * quantities, which is exactly backwards: the tall thin capsules at the far
 * end of the horizon ARE the message that the far end is soft.
 *
 * No chart library. Twelve static intervals on a linear axis is one div per
 * week, and hanging recharts — and a client bundle — off a server-rendered
 * page to draw them was the more expensive of two identical pictures.
 */

export type ChartWeek = {
  weekStart: Date
  expected: number
  min: number
  max: number
  risk: boolean
}

/** A round number at or above the tallest interval, for the top gridline. */
function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (value <= step * magnitude) return step * magnitude
  }
  return 10 * magnitude
}

/** Consecutive weeks sharing a month, so the axis can carry a calendar band. */
function monthSpans(weeks: readonly ChartWeek[]) {
  const spans: { month: number; count: number }[] = []
  for (const week of weeks) {
    const month = week.weekStart.getUTCMonth()
    const last = spans.at(-1)
    if (last && last.month === month) last.count += 1
    else spans.push({ month, count: 1 })
  }
  return spans
}

const TICKS = [1, 0.75, 0.5, 0.25, 0]

export function ProjectionChart({ weeks }: { weeks: ChartWeek[] }) {
  if (!weeks.some(w => w.max > 0)) {
    return (
      <EmptyState
        title="Belum ada panen yang diproyeksikan"
        description="Proyeksi muncul setelah ada blok yang ditanam dan data cuaca tersedia untuk lahannya."
      />
    )
  }

  const axis = niceMax(Math.max(...weeks.map(w => w.max)))
  const pct = (value: number) => (value / axis) * 100

  const peak = weeks.reduce((best, w) => (w.expected > best.expected ? w : best), weeks[0])
  const flagged = weeks.filter(w => w.risk).length

  return (
    <figure
      className="flex flex-col"
      role="img"
      aria-label={
        `Proyeksi ${weeks.length} minggu. Puncak ${formatNumberId(peak.expected)} ton pada minggu ` +
        `${peak.weekStart.getUTCDate()} ${MONTHS_ID[peak.weekStart.getUTCMonth()]}. ` +
        (flagged > 0
          ? `${flagged} minggu melewati kapasitas koperasi.`
          : 'Tidak ada minggu yang melewati kapasitas.')
      }
    >
      <div className="flex gap-2.5">
        {/* The scale. Mono and right-aligned, so the digits stack — the one
            thing a proportional face cannot do down a column. */}
        <div className="relative h-52 w-7 shrink-0 sm:h-60">
          <span className="absolute -top-4 right-0 text-[0.625rem] text-[var(--terrion-ink-faint)]">
            ton
          </span>
          {TICKS.map(t => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 font-mono text-[0.625rem] tabular-nums text-[var(--terrion-ink-faint)]"
              style={{ top: `${(1 - t) * 100}%` }}
            >
              {formatNumberId(axis * t, axis < 10 ? 1 : 0)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-52 sm:h-60">
            {TICKS.map(t => (
              <span
                key={t}
                aria-hidden
                className={cn(
                  'absolute inset-x-0 h-px',
                  t === 0 ? 'bg-[var(--terrion-ink-faint)]' : 'bg-border',
                )}
                style={{ top: `${(1 - t) * 100}%` }}
              />
            ))}

            <div className="absolute inset-0 flex items-stretch">
              {weeks.map((week, i) => (
                <div key={i} className="group/week relative flex-1">
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-sm group-hover/week:bg-muted"
                  />

                  {/* This week, marked once. The projection's whole subject is
                      *when*, and a chart with no "now" on it is a list. */}
                  {i === 0 && (
                    <>
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-px bg-[var(--terrion-green-500)]"
                      />
                      <span className="absolute top-0 left-1.5 text-[0.625rem] whitespace-nowrap text-[var(--terrion-green-600)]">
                        minggu ini
                      </span>
                    </>
                  )}

                  <span
                    aria-hidden
                    className="grow-up absolute inset-x-0 bottom-0 top-0"
                    style={{ '--grow-delay': `${i * 35}ms` } as CSSProperties}
                  >
                    <span
                      className={cn(
                        'absolute left-1/2 w-[52%] max-w-[18px] -translate-x-1/2 rounded-full',
                        week.risk
                          ? 'bg-[var(--terrion-gold-200)]'
                          : 'bg-[var(--terrion-green-200)]',
                      )}
                      style={{
                        bottom: `${pct(week.min)}%`,
                        height: `max(${pct(week.max - week.min)}%, 3px)`,
                      }}
                    />
                    <span
                      className={cn(
                        'absolute left-1/2 h-[5px] w-[52%] max-w-[18px] -translate-x-1/2 rounded-full',
                        week.risk ? 'bg-accent' : 'bg-[var(--terrion-green-600)]',
                      )}
                      style={{ bottom: `calc(${pct(week.expected)}% - 2.5px)` }}
                    />
                  </span>

                  {/* The word as well as the colour: gold alone fails for a
                      reader who cannot separate it from green, and dies the
                      moment somebody prints this for a members' meeting. */}
                  {week.risk && (
                    <span
                      className="absolute inset-x-0 text-center text-[0.625rem] font-medium text-accent"
                      style={{ bottom: `calc(${pct(week.max)}% + 5px)` }}
                    >
                      Padat
                    </span>
                  )}

                  {/* Read on hover, not fetched on hover — every figure in here
                      is already in the markup, so there is no tooltip runtime
                      and no client component. */}
                  <span
                    className={cn(
                      'pointer-events-none absolute bottom-full z-20 mb-1 hidden rounded-md border border-border bg-popover px-2.5 py-1.5 text-left whitespace-nowrap shadow-[var(--shadow-md)] group-hover/week:block',
                      // The panel clips its own overflow, so a centred popover
                      // on the last column loses half of itself to the panel's
                      // right edge. The end weeks anchor to their own edge.
                      i === weeks.length - 1
                        ? 'right-0'
                        : i === 0
                          ? 'left-0'
                          : 'left-1/2 -translate-x-1/2',
                    )}
                  >
                    <span className="block text-[0.6875rem] font-medium text-foreground">
                      Minggu {week.weekStart.getUTCDate()} {MONTHS_ID[week.weekStart.getUTCMonth()]}
                    </span>
                    <span className="block text-[0.6875rem] tabular-nums text-muted-foreground">
                      Perkiraan {formatNumberId(week.expected)} ton
                    </span>
                    <span className="block text-[0.6875rem] tabular-nums text-[var(--terrion-ink-faint)]">
                      Rentang {formatNumberId(week.min)}–{formatNumberId(week.max)} ton
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* The calendar band: day of month per week, month names under the
              run of weeks they cover. A cooperative reads its season off a wall
              calendar, and twelve repetitions of "7 Sep" is not one. */}
          <div className="mt-2 flex">
            {weeks.map((week, i) => (
              <span
                key={i}
                className={cn(
                  'flex-1 text-center font-mono text-[0.625rem] tabular-nums',
                  i === 0
                    ? 'font-medium text-[var(--terrion-green-700)]'
                    : 'text-[var(--terrion-ink-faint)]',
                )}
              >
                {week.weekStart.getUTCDate()}
              </span>
            ))}
          </div>

          <div className="mt-1.5 flex border-t border-border pt-1.5">
            {monthSpans(weeks).map(span => (
              <span
                key={span.month}
                className="border-l border-border pl-2 text-[0.6875rem] text-muted-foreground first:border-l-0 first:pl-0"
                style={{ flexGrow: span.count, flexBasis: 0 }}
              >
                {MONTHS_ID[span.month]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  )
}

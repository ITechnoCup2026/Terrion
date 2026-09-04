'use client'

import { addDays } from '@/lib/agronomy/dates'
import type { SupplyWeek } from '@/lib/atlas/supply'
import { MONTHS_ID } from '@/lib/harvest/format'

/**
 * Scrubs the Atlas through the weeks it can see.
 *
 * The map shades every region by its whole twelve-week projection, which
 * answers "where is there supply" and hides "when". Those are different
 * questions for a buyer: a province that looks heavy across the horizon may be
 * heavy in two weeks of it and empty in the other ten, and that is exactly the
 * pile-up the rest of the product exists to find.
 *
 * Position 0 is the whole horizon rather than the first week, because that is
 * what the map should open on -- the shape of the country first, the timing
 * second.
 *
 * A native range input, for the same reasons as the farm's time slider: it is
 * keyboard operable, screen readers announce it, and touch already works.
 */
export function SupplyWeekScrubber({
  weeks, value, onChange, className,
}: {
  weeks: SupplyWeek[]
  /** The ISO week being shown, or null for the whole horizon. */
  value: string | null
  onChange: (isoWeek: string | null) => void
  className?: string
}) {
  // Nothing to scrub through with one week or none: the control would be a
  // track with a single stop, which says less than the label above it.
  if (weeks.length < 2) return null

  const index = value === null ? 0 : weeks.findIndex(w => w.isoWeek === value) + 1
  const current = value === null ? null : weeks[index - 1]

  return (
    <div
      className={
        'rounded-xl border border-border bg-card/95 px-4 py-3 shadow-[var(--shadow-md)] '
        + `backdrop-blur-sm ${className ?? ''}`
      }
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted-foreground">Pasokan minggu</span>
        <span className="text-sm font-medium tabular-nums text-foreground">
          {current ? weekLabel(current) : `${weeks.length} minggu ke depan`}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={weeks.length}
        step={1}
        value={index}
        aria-label="Geser untuk melihat pasokan per minggu"
        aria-valuetext={current ? weekLabel(current) : 'Seluruh horizon'}
        onChange={event => {
          const next = Number(event.target.value)
          onChange(next === 0 ? null : weeks[next - 1].isoWeek)
        }}
        className="h-6 w-full cursor-pointer accent-primary"
      />

      <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[0.7rem] text-muted-foreground">
        <span>Semua</span>
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Lihat semua minggu
          </button>
        )}
        <span>{weekLabel(weeks[weeks.length - 1])}</span>
      </div>
    </div>
  )
}

/** "28 Sep – 4 Okt", dropping the repeated month when both ends share one. */
function weekLabel(week: SupplyWeek): string {
  const start = week.weekStart
  const end = addDays(start, 6)

  const startMonth = MONTHS_ID[start.getUTCMonth()]
  const endMonth = MONTHS_ID[end.getUTCMonth()]

  return startMonth === endMonth
    ? `${start.getUTCDate()}–${end.getUTCDate()} ${endMonth}`
    : `${start.getUTCDate()} ${startMonth} – ${end.getUTCDate()} ${endMonth}`
}

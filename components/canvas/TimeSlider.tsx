'use client'

import { formatDateId } from '@/lib/harvest/format'
import {
  dateAtFraction, fractionOfDate, timelineDays, type TimelineBounds,
} from '@/lib/canvas/timeline'

/**
 * Scrub through the season and watch the crops grow.
 *
 * A native range input rather than a custom drag handle: it is keyboard
 * operable, screen readers announce it, and touch already works -- three
 * things a div with pointer handlers would each have to earn back.
 *
 * The whole control is client-side arithmetic. Every block already carries its
 * daily GDD series, so moving this makes no request; see lib/canvas/timeline.
 */
export function TimeSlider({
  bounds, value, onChange, className, projectedFrom = null, bare = false,
}: {
  bounds: TimelineBounds
  value: Date
  onChange: (date: Date) => void
  className?: string
  /** Where real weather ends and a climatology-based projection of the rest
   *  of the season begins. Draws a tick on the track and labels the date
   *  once scrubbed past it, so a projected growth stage is never mistaken
   *  for an observed one. Null when the crop already matured within known
   *  weather -- there is nothing to mark. */
  projectedFrom?: Date | null
  /** Drops the card chrome, for a slider seated in a panel that already has a
   *  border and a background of its own. Floating over the canvas it needs
   *  both; inside the panel they read as a card nested in a card. */
  bare?: boolean
}) {
  const days = timelineDays(bounds)
  const position = Math.round(fractionOfDate(bounds, value) * days)
  const today = new Date()
  const isToday = value.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)
  const isProjected = projectedFrom != null && value >= projectedFrom
  const projectedMarkerPct = projectedFrom ? fractionOfDate(bounds, projectedFrom) * 100 : null

  return (
    <div
      className={[
        bare ? '' : 'rounded-xl border border-border bg-card/95 px-4 py-3 backdrop-blur-sm',
        className ?? '',
      ].filter(Boolean).join(' ')}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted-foreground">Lihat tanggal</span>
        <span className="flex items-center gap-1.5 text-sm font-medium tabular-nums text-foreground">
          {formatDateId(value)}
          {isProjected && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-normal normal-case leading-none text-muted-foreground">
              proyeksi
            </span>
          )}
        </span>
      </div>

      <div className="relative flex items-center">
        {/* Marks where observed/forecast weather runs out. Not a fill on the
            track itself -- range inputs style that per-browser, and a tick
            reads the same everywhere. */}
        {projectedMarkerPct != null && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 h-3 w-px -translate-y-1/2 bg-muted-foreground/50"
            style={{ left: `${projectedMarkerPct}%` }}
          />
        )}
        <input
          type="range"
          min={0}
          max={days}
          step={1}
          value={position}
          aria-label="Geser untuk melihat pertumbuhan tanaman"
          aria-valuetext={
            isProjected ? `${formatDateId(value)}, proyeksi` : formatDateId(value)
          }
          onChange={e => onChange(dateAtFraction(bounds, Number(e.target.value) / days))}
          className="h-6 w-full cursor-pointer accent-primary"
        />
      </div>

      <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[0.7rem] text-muted-foreground">
        <span>{formatDateId(bounds.start)}</span>
        {!isToday && (
          <button
            type="button"
            onClick={() => onChange(today)}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Kembali ke hari ini
          </button>
        )}
        <span>{formatDateId(bounds.end)}</span>
      </div>
    </div>
  )
}

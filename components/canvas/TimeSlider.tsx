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
  bounds, value, onChange, className,
}: {
  bounds: TimelineBounds
  value: Date
  onChange: (date: Date) => void
  className?: string
}) {
  const days = timelineDays(bounds)
  const position = Math.round(fractionOfDate(bounds, value) * days)
  const today = new Date()
  const isToday = value.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)

  return (
    <div
      className={`rounded-xl border border-border bg-card/95 px-4 py-3 backdrop-blur-sm ${className ?? ''}`}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted-foreground">Lihat tanggal</span>
        <span className="text-sm font-medium tabular-nums text-foreground">
          {formatDateId(value)}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={days}
        step={1}
        value={position}
        aria-label="Geser untuk melihat pertumbuhan tanaman"
        aria-valuetext={formatDateId(value)}
        onChange={e => onChange(dateAtFraction(bounds, Number(e.target.value) / days))}
        className="h-6 w-full cursor-pointer accent-primary"
      />

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

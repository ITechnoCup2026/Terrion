// The 12-week harvest projection the dashboard chart draws.
//
// Two things this owes the reader that a naive group-by would not give:
//
// 1. Every week in the horizon appears, even the empty ones. Omitting a quiet
//    week compresses the axis and makes a gap in the schedule read as a run of
//    busy weeks — the opposite of the truth.
//
// 2. The bars carry a band, not just a point. A harvest window spanning eight
//    days does not commit its tonnage to any one week, and spreading it evenly
//    (which is what the collision detector does, correctly, for thresholding)
//    hides that. The band states what is certain and what is merely possible.

import { addDays, daysBetween, isoWeekKey, isoWeekStart } from '@/lib/agronomy/dates'
import type { BlockProjection } from '@/lib/agronomy/types'

export const DEFAULT_HORIZON_WEEKS = 12

export type ProjectionWeek = {
  isoWeek: string
  weekStart: Date
  /** Tonnage spread evenly across each window — the point estimate. */
  expectedTonnes: number
  /** Tonnage whose entire window falls in this week; it cannot land elsewhere. */
  minTonnes: number
  /** Tonnage from every window overlapping this week; it could all land here. */
  maxTonnes: number
  blockIds: string[]
}

// How many days of [start, end] fall inside [weekStart, weekEnd], inclusive.
function overlapDays(start: Date, end: Date, weekStart: Date, weekEnd: Date): number {
  const from = start > weekStart ? start : weekStart
  const to = end < weekEnd ? end : weekEnd
  const days = daysBetween(from, to) + 1
  return days > 0 ? days : 0
}

/**
 * A fixed-length run of consecutive ISO weeks starting at the week containing
 * `from`, each carrying its expected tonnage and an uncertainty band.
 */
export function weeklyProjection(input: {
  projections: BlockProjection[]
  from: Date
  weeks?: number
}): ProjectionWeek[] {
  const horizon = input.weeks ?? DEFAULT_HORIZON_WEEKS
  const first = isoWeekStart(input.from)

  return Array.from({ length: horizon }, (_, i) => {
    const weekStart = addDays(first, i * 7)
    const weekEnd = addDays(weekStart, 6)

    const week: ProjectionWeek = {
      isoWeek: isoWeekKey(weekStart),
      weekStart,
      expectedTonnes: 0,
      minTonnes: 0,
      maxTonnes: 0,
      blockIds: [],
    }

    for (const p of input.projections) {
      const span = Math.max(1, daysBetween(p.window.start, p.window.end) + 1)
      const inside = overlapDays(p.window.start, p.window.end, weekStart, weekEnd)
      if (inside === 0) continue

      week.expectedTonnes += (p.expectedTonnes / span) * inside
      week.maxTonnes += p.expectedTonnes
      if (p.window.start >= weekStart && p.window.end <= weekEnd) {
        week.minTonnes += p.expectedTonnes
      }
      week.blockIds.push(p.blockId)
    }

    return week
  })
}

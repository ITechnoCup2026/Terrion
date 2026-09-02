// The rule behind every supply ruler in the product.
//
// Here rather than in the component for the same reason `lib/harvest/format`
// is: it is a rule, it has edge cases, and a rule with edge cases that lives
// inside JSX cannot be tested. The component does layout; this decides what
// the layout is of.

import { addDays } from '@/lib/agronomy/dates'
import type { Listing } from '@/lib/catalog/listings'
import { MONTHS_ID } from '@/lib/harvest/format'

/** The ruler reaches exactly as far as the catalogue and the dashboard chart. */
export const RULER_WEEKS = 12

/** How many crops the ruler shows before it stops being readable. */
export const RULER_MAX_ROWS = 5

/**
 * A tick closer than this to the one before it has no room for its own label,
 * so one of the two is dropped. A share of the track rather than a pixel
 * count, and sized for the narrowest the track ever gets -- a phone, where a
 * three-letter month is about a tenth of the whole scale. Tuning it to the
 * desktop width instead would let the labels collide on the screen most
 * kaders actually read this on.
 */
const MIN_TICK_GAP_PERCENT = 10

export type RulerRow = {
  commodity: string
  tonnes: number
  /** Contiguous runs of harvesting weeks, as [firstWeekIndex, weekCount]. */
  runs: [number, number][]
}

/**
 * Listings -> one row per commodity, with adjacent harvesting weeks merged.
 *
 * Merging is the point. Rendering one band per listing would stack a dozen
 * translucent rectangles on the same week and turn tonnage into an accidental
 * opacity scale — a heat map nobody designed and no legend explains. A run
 * says the true and simpler thing: this crop is coming in, from here to here.
 *
 * Rows come back heaviest first and capped, because a ruler with fourteen
 * labels down its side is a table pretending to be a picture.
 */
export function supplyRows(listings: readonly Listing[], from: Date): RulerRow[] {
  const weekStarts = Array.from({ length: RULER_WEEKS }, (_, i) => addDays(from, i * 7))
  const byCommodity = new Map<string, { tonnes: number; weeks: boolean[] }>()

  for (const listing of listings) {
    const entry = byCommodity.get(listing.commodityName)
      ?? { tonnes: 0, weeks: Array<boolean>(RULER_WEEKS).fill(false) }
    entry.tonnes += listing.tonnes

    for (let i = 0; i < RULER_WEEKS; i++) {
      const weekStart = weekStarts[i]
      const weekEnd = addDays(weekStart, 7)
      // Half-open at the top: a window that ends exactly on a boundary belongs
      // to the week it was harvested in, not to the one that follows it.
      if (listing.weekStart < weekEnd && listing.weekEnd >= weekStart) {
        entry.weeks[i] = true
      }
    }
    byCommodity.set(listing.commodityName, entry)
  }

  return [...byCommodity.entries()]
    .map(([commodity, { tonnes, weeks }]) => ({ commodity, tonnes, runs: toRuns(weeks) }))
    .filter(row => row.runs.length > 0)
    .sort((a, b) => b.tonnes - a.tonnes)
    .slice(0, RULER_MAX_ROWS)
}

/** Contiguous trues, as [start, length] pairs. */
function toRuns(weeks: readonly boolean[]): [number, number][] {
  const runs: [number, number][] = []
  let start = -1

  for (let i = 0; i <= weeks.length; i++) {
    if (weeks[i]) {
      if (start === -1) start = i
    } else if (start !== -1) {
      runs.push([start, i - start])
      start = -1
    }
  }
  return runs
}

/**
 * Where each month's name sits along the track, as a percentage of its width.
 *
 * The track starts on an ISO week, so day zero lands anywhere inside a month.
 * When it lands late, the opening label and the next month's boundary collide
 * — "Agu" printed on top of "Sep". A tick that would land within a label's own
 * width of the previous one therefore replaces it, and the real boundary wins
 * over the partial month it interrupts.
 */
export function monthTicks(from: Date): { label: string; left: number }[] {
  const ticks: { label: string; left: number }[] = []
  const totalDays = RULER_WEEKS * 7

  for (let day = 0; day <= totalDays; day++) {
    const date = addDays(from, day)
    if (day !== 0 && date.getUTCDate() !== 1) continue

    const label = MONTHS_ID[date.getUTCMonth()]
    const left = (day / totalDays) * 100
    const previous = ticks.at(-1)

    if (previous?.label === label) continue
    if (previous && left - previous.left < MIN_TICK_GAP_PERCENT) ticks.pop()
    ticks.push({ label, left })
  }
  return ticks
}

/**
 * Resolving what a block looked like on a given day, in the browser.
 *
 * The point of this module is that dragging the time slider makes NO network
 * requests. Every block already carries `cumulativeGdd` -- the running heat
 * total per day, computed once by predictHarvest on the server -- so the stage
 * on any date is a lookup in an array that is already here. Asking the server
 * per frame would be a request storm and would make scrubbing feel like
 * loading; resolving the stage server-side would mean the same thing.
 *
 * Pure and testable: it is handed the series and a date, and fetches nothing.
 */

import { growthStage } from '@/lib/agronomy/gdd'
import type { GrowthStage } from '@/lib/agronomy/types'

/** What the slider needs from a block, and nothing more. */
export type TimelineBlock = {
  plantingDate: Date
  gddRequired: number
  cumulativeGdd: { date: string; gdd: number }[]
}

export type TimelineBounds = { start: Date; end: Date }

const DAY_MS = 86_400_000

/** Midnight UTC on the same day, because every date in the app is UTC. */
function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/**
 * How grown one block was on a given date.
 *
 * Before the planting date this is bare soil. The spec called that out as an
 * open question -- the slider can scrub back past planting and no stage was
 * defined for it -- and bare soil is the answer: the field was empty, and
 * showing stage 0 seedlings on a date before anything was sown would be the
 * picture claiming something that did not happen.
 *
 * After the series ends the crop holds at whatever it had reached, rather than
 * dropping back to nothing.
 */
export function stageOn(block: TimelineBlock, date: Date): GrowthStage {
  const day = startOfUtcDay(date)
  if (day <= startOfUtcDay(block.plantingDate)) return 0
  if (block.cumulativeGdd.length === 0) return 0

  const iso = day.toISOString().slice(0, 10)

  // The last recorded day at or before the date. The series is ascending, so a
  // binary search keeps a drag cheap even on a decade of weather.
  let lo = 0, hi = block.cumulativeGdd.length - 1, found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (block.cumulativeGdd[mid].date <= iso) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  if (found < 0) return 0
  return growthStage(block.cumulativeGdd[found].gdd, block.gddRequired)
}

/**
 * The span the slider covers: earliest planting to the last day anything knows
 * about. Null when no block has a series, which is what hides the slider --
 * a track with nothing to scrub is a control that lies about being useful.
 */
export function timelineBounds(blocks: TimelineBlock[]): TimelineBounds | null {
  const withSeries = blocks.filter(b => b.cumulativeGdd.length > 0)
  if (withSeries.length === 0) return null

  const starts = withSeries.map(b => startOfUtcDay(b.plantingDate).getTime())
  const ends = withSeries.map(b => new Date(`${b.cumulativeGdd.at(-1)!.date}T00:00:00Z`).getTime())

  const start = new Date(Math.min(...starts))
  const end = new Date(Math.max(...ends))
  return end > start ? { start, end } : null
}

/** The date at a position along the track, snapped to a whole day. */
export function dateAtFraction(bounds: TimelineBounds, fraction: number): Date {
  const f = Math.min(1, Math.max(0, fraction))
  const span = bounds.end.getTime() - bounds.start.getTime()
  return startOfUtcDay(new Date(bounds.start.getTime() + Math.round((span * f) / DAY_MS) * DAY_MS))
}

/** Where a date sits along the track, 0 to 1. */
export function fractionOfDate(bounds: TimelineBounds, date: Date): number {
  const span = bounds.end.getTime() - bounds.start.getTime()
  if (span <= 0) return 0
  const f = (date.getTime() - bounds.start.getTime()) / span
  return Math.min(1, Math.max(0, f))
}

/** How many days the season runs, for sizing the slider's steps. */
export function timelineDays(bounds: TimelineBounds): number {
  return Math.max(1, Math.round((bounds.end.getTime() - bounds.start.getTime()) / DAY_MS))
}

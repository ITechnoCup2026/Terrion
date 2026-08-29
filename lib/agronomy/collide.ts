// L3: where predicted harvest windows pile up beyond what the cooperative can
// physically handle in one week, and the smallest schedule shift that relieves it.

import { addDays, daysBetween, isoWeekKey, isoWeekStart } from './dates'
import type { BlockProjection } from './types'

export const MEDIAN_MULTIPLIER = 2.5
const SHIFT_CANDIDATES = [7, 10, 14, -7, -10, -14]

export type WeekBucket = {
  isoWeek: string; weekStart: Date; commodityId: string
  tonnes: number; blockIds: string[]
}
export type FlaggedWeek = WeekBucket & {
  basis: 'capacity' | 'median'; threshold: number; contributingBlockIds: string[]
}
export type StaggerSuggestion = {
  isoWeek: string; commodityId: string; blockIds: string[]
  shiftDays: number; tonnesMoved: number; resultingTonnes: number
}

/** Spread a projection's tonnage evenly across every day of its window,
 *  then roll the days up into ISO weeks. A window straddling two weeks
 *  contributes to both, proportionally. */
export function bucketByWeek(projections: BlockProjection[]): Map<string, WeekBucket> {
  const buckets = new Map<string, WeekBucket>()
  for (const p of projections) {
    const dayCount = Math.max(1, daysBetween(p.window.start, p.window.end) + 1)
    const perDay = p.expectedTonnes / dayCount
    for (let i = 0; i < dayCount; i++) {
      const d = addDays(p.window.start, i)
      const key = `${p.commodityId}|${isoWeekKey(d)}`
      const existing = buckets.get(key)
      if (existing) {
        existing.tonnes += perDay
        if (!existing.blockIds.includes(p.blockId)) existing.blockIds.push(p.blockId)
      } else {
        buckets.set(key, {
          isoWeek: isoWeekKey(d), weekStart: isoWeekStart(d),
          commodityId: p.commodityId, tonnes: perDay, blockIds: [p.blockId],
        })
      }
    }
  }
  return buckets
}

// Middle value of a list, averaging the two middles when the count is even.
function median(values: number[]): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// Bucket every projection into weeks, flag the overloaded ones, and propose shifts.
export function detectCollisions(
  projections: BlockProjection[],
  capacity: Map<string, number> | null,
): { weeks: WeekBucket[]; flagged: FlaggedWeek[]; suggestions: StaggerSuggestion[] } {
  if (projections.length === 0) return { weeks: [], flagged: [], suggestions: [] }

  const weeks = [...bucketByWeek(projections).values()]
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())

  const thresholdFor = (commodityId: string): { value: number; basis: 'capacity' | 'median' } => {
    const set = capacity?.get(commodityId)
    if (set != null) return { value: set, basis: 'capacity' }
    const forCommodity = weeks.filter(w => w.commodityId === commodityId).map(w => w.tonnes)
    return { value: median(forCommodity) * MEDIAN_MULTIPLIER, basis: 'median' }
  }

  const flagged: FlaggedWeek[] = []
  for (const w of weeks) {
    const { value, basis } = thresholdFor(w.commodityId)
    if (value > 0 && w.tonnes > value) {
      flagged.push({ ...w, basis, threshold: value, contributingBlockIds: [...w.blockIds] })
    }
  }

  // Greedy: shift the largest contributors first until the peak clears.
  const suggestions: StaggerSuggestion[] = []
  for (const week of flagged) {
    const contributors = projections
      .filter(p => week.contributingBlockIds.includes(p.blockId))
      .sort((a, b) => b.expectedTonnes - a.expectedTonnes)

    let best: StaggerSuggestion | null = null
    for (const shiftDays of SHIFT_CANDIDATES) {
      const moved: string[] = []
      let remaining = [...projections]
      for (const c of contributors) {
        moved.push(c.blockId)
        remaining = remaining.map(p => p.blockId === c.blockId
          ? { ...p, window: { start: addDays(p.window.start, shiftDays),
                              end: addDays(p.window.end, shiftDays) } }
          : p)
        const after = [...bucketByWeek(remaining).values()]
          .find(w => w.isoWeek === week.isoWeek && w.commodityId === week.commodityId)
        const resulting = after?.tonnes ?? 0
        if (resulting <= week.threshold) {
          const candidate: StaggerSuggestion = {
            isoWeek: week.isoWeek, commodityId: week.commodityId,
            blockIds: [...moved], shiftDays,
            tonnesMoved: week.tonnes - resulting, resultingTonnes: resulting,
          }
          if (!best || candidate.blockIds.length < best.blockIds.length) best = candidate
          break
        }
      }
    }
    if (best) suggestions.push(best)
  }

  return { weeks, flagged, suggestions }
}

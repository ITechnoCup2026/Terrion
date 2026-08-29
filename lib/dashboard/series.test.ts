import { describe, expect, it } from 'vitest'

import { addDays, isoWeekKey, isoWeekStart } from '@/lib/agronomy/dates'
import type { BlockProjection } from '@/lib/agronomy/types'

import { weeklyProjection } from './series'

const utc = (s: string) => new Date(`${s}T00:00:00Z`)

// A Monday, so week arithmetic in the tests is unambiguous.
const W0 = isoWeekStart(utc('2026-10-19'))

const projection = (
  blockId: string,
  start: Date,
  end: Date,
  expectedTonnes: number,
): BlockProjection => ({
  blockId,
  plotId: `plot-${blockId}`,
  commodityId: 'padi',
  window: { start, end },
  expectedTonnes,
})

describe('weeklyProjection', () => {
  it('returns exactly the requested number of weeks', () => {
    const weeks = weeklyProjection({ projections: [], from: W0, weeks: 12 })
    expect(weeks).toHaveLength(12)
  })

  it('defaults to a 12-week horizon', () => {
    expect(weeklyProjection({ projections: [], from: W0 })).toHaveLength(12)
  })

  it('returns consecutive weeks starting at the ISO week containing `from`', () => {
    const weeks = weeklyProjection({ projections: [], from: addDays(W0, 3), weeks: 3 })
    expect(weeks[0].weekStart.toISOString()).toBe(W0.toISOString())
    expect(weeks[1].weekStart.toISOString()).toBe(addDays(W0, 7).toISOString())
    expect(weeks[2].weekStart.toISOString()).toBe(addDays(W0, 14).toISOString())
    expect(weeks[0].isoWeek).toBe(isoWeekKey(W0))
  })

  // A week nobody harvests in is still a week. Dropping it would compress the
  // x-axis and make a gap in the schedule look like a run of busy weeks.
  it('keeps empty weeks at zero rather than omitting them', () => {
    const weeks = weeklyProjection({
      projections: [projection('a', W0, addDays(W0, 6), 10)],
      from: W0,
      weeks: 3,
    })
    expect(weeks[1].expectedTonnes).toBe(0)
    expect(weeks[1].minTonnes).toBe(0)
    expect(weeks[1].maxTonnes).toBe(0)
    expect(weeks[1].blockIds).toEqual([])
  })

  it('credits a window sitting inside one week entirely to that week', () => {
    const weeks = weeklyProjection({
      projections: [projection('a', addDays(W0, 1), addDays(W0, 5), 14)],
      from: W0,
      weeks: 2,
    })
    expect(weeks[0].expectedTonnes).toBeCloseTo(14, 6)
    expect(weeks[0].minTonnes).toBeCloseTo(14, 6)
    expect(weeks[0].maxTonnes).toBeCloseTo(14, 6)
    expect(weeks[0].blockIds).toEqual(['a'])
  })

  it('splits a straddling window proportionally across the weeks it touches', () => {
    // 8 days: 6 in week 0 (days 1..6), 2 in week 1 (days 7..8).
    const weeks = weeklyProjection({
      projections: [projection('a', addDays(W0, 1), addDays(W0, 8), 80)],
      from: W0,
      weeks: 2,
    })
    expect(weeks[0].expectedTonnes).toBeCloseTo(60, 6)
    expect(weeks[1].expectedTonnes).toBeCloseTo(20, 6)
  })

  // The band is the honest part: a straddling block is guaranteed to no single
  // week, but could in principle land wholly in either.
  it('gives a straddling window zero minimum and full maximum in both weeks', () => {
    const weeks = weeklyProjection({
      projections: [projection('a', addDays(W0, 1), addDays(W0, 8), 80)],
      from: W0,
      weeks: 2,
    })
    expect(weeks[0].minTonnes).toBe(0)
    expect(weeks[1].minTonnes).toBe(0)
    expect(weeks[0].maxTonnes).toBeCloseTo(80, 6)
    expect(weeks[1].maxTonnes).toBeCloseTo(80, 6)
  })

  it('brackets the expected value with the band', () => {
    const weeks = weeklyProjection({
      projections: [
        projection('a', addDays(W0, 1), addDays(W0, 8), 80),
        projection('b', addDays(W0, 2), addDays(W0, 4), 5),
      ],
      from: W0,
      weeks: 2,
    })
    for (const w of weeks) {
      expect(w.minTonnes).toBeLessThanOrEqual(w.expectedTonnes + 1e-9)
      expect(w.maxTonnes).toBeGreaterThanOrEqual(w.expectedTonnes - 1e-9)
    }
  })

  it('ignores projections outside the horizon', () => {
    const weeks = weeklyProjection({
      projections: [projection('old', addDays(W0, -30), addDays(W0, -25), 99)],
      from: W0,
      weeks: 4,
    })
    expect(weeks.every(w => w.expectedTonnes === 0)).toBe(true)
  })

  it('lists each contributing block once', () => {
    const weeks = weeklyProjection({
      projections: [projection('a', W0, addDays(W0, 6), 10)],
      from: W0,
      weeks: 1,
    })
    expect(weeks[0].blockIds).toEqual(['a'])
  })
})

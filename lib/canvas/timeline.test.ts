import { describe, expect, it } from 'vitest'

import { stageOn, timelineBounds, dateAtFraction, fractionOfDate } from './timeline'

// A block planted 1 June that needs 1000 GDD, gaining 10 a day.
const series = Array.from({ length: 120 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 5, 1))
  d.setUTCDate(d.getUTCDate() + i)
  return { date: d.toISOString().slice(0, 10), gdd: (i + 1) * 10 }
})

const block = {
  plantingDate: new Date(Date.UTC(2026, 5, 1)),
  gddRequired: 1000,
  cumulativeGdd: series,
}

describe('stageOn', () => {
  // The spec left this open and asked for it to be decided rather than
  // discovered as a bug: scrubbing back before planting shows bare soil.
  it('is bare soil before the planting date', () => {
    expect(stageOn(block, new Date(Date.UTC(2026, 4, 20)))).toBe(0)
    expect(stageOn(block, new Date(Date.UTC(2026, 4, 31)))).toBe(0)
  })

  it('is bare soil on the planting day itself', () => {
    expect(stageOn(block, new Date(Date.UTC(2026, 5, 1)))).toBe(0)
  })

  it('grows through every stage as the season runs', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 120; i++) {
      const d = new Date(Date.UTC(2026, 5, 1))
      d.setUTCDate(d.getUTCDate() + i)
      seen.add(stageOn(block, d))
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4])
  })

  it('never goes backwards as the date advances', () => {
    let last = -1
    for (let i = 0; i < 120; i++) {
      const d = new Date(Date.UTC(2026, 5, 1))
      d.setUTCDate(d.getUTCDate() + i)
      const s = stageOn(block, d)
      expect(s).toBeGreaterThanOrEqual(last)
      last = s
    }
  })

  it('holds at ripe past the end of the series rather than resetting', () => {
    expect(stageOn(block, new Date(Date.UTC(2027, 0, 1)))).toBe(4)
  })

  it('reads the last day at or before the date, not the nearest', () => {
    // The series gains 10 GDD a day from 1 June, so it crosses 1000 at index
    // 99 -- 8 September. The day before is still short of the requirement.
    expect(stageOn(block, new Date(Date.UTC(2026, 8, 7)))).toBe(3)
    expect(stageOn(block, new Date(Date.UTC(2026, 8, 8)))).toBe(4)
  })

  it('is bare soil when the block has no series at all', () => {
    expect(stageOn({ ...block, cumulativeGdd: [] }, new Date(Date.UTC(2026, 7, 1)))).toBe(0)
  })
})

describe('timelineBounds', () => {
  it('spans from the earliest planting to the latest recorded day', () => {
    const b = timelineBounds([block])
    expect(b!.start.toISOString().slice(0, 10)).toBe('2026-06-01')
    expect(b!.end.toISOString().slice(0, 10)).toBe('2026-09-28')
  })

  it('covers every block when they were planted at different times', () => {
    const later = {
      plantingDate: new Date(Date.UTC(2026, 6, 15)),
      gddRequired: 800,
      cumulativeGdd: [{ date: '2026-11-30', gdd: 900 }],
    }
    const b = timelineBounds([block, later])
    expect(b!.start.toISOString().slice(0, 10)).toBe('2026-06-01')
    expect(b!.end.toISOString().slice(0, 10)).toBe('2026-11-30')
  })

  it('is null when nothing has a series to scrub through', () => {
    expect(timelineBounds([])).toBeNull()
    expect(timelineBounds([{ ...block, cumulativeGdd: [] }])).toBeNull()
  })
})

describe('dateAtFraction / fractionOfDate', () => {
  const bounds = {
    start: new Date(Date.UTC(2026, 5, 1)),
    end: new Date(Date.UTC(2026, 8, 1)),
  }

  it('maps the ends of the track to the ends of the season', () => {
    expect(dateAtFraction(bounds, 0).toISOString().slice(0, 10)).toBe('2026-06-01')
    expect(dateAtFraction(bounds, 1).toISOString().slice(0, 10)).toBe('2026-09-01')
  })

  it('clamps a fraction outside the track', () => {
    expect(dateAtFraction(bounds, -5).toISOString().slice(0, 10)).toBe('2026-06-01')
    expect(dateAtFraction(bounds, 9).toISOString().slice(0, 10)).toBe('2026-09-01')
  })

  it('round-trips a date back to its own fraction', () => {
    const d = dateAtFraction(bounds, 0.5)
    expect(fractionOfDate(bounds, d)).toBeCloseTo(0.5, 5)
  })

  it('returns whole days, so the label never shows a fractional date', () => {
    const d = dateAtFraction(bounds, 0.3777)
    expect(d.getUTCHours()).toBe(0)
    expect(d.getUTCMinutes()).toBe(0)
  })
})

import { describe, it, expect } from 'vitest'
import { detectCollisions } from './collide'
import { utcDate } from './dates'
import type { BlockProjection } from './types'

const p = (id: string, start: string, end: string, tonnes: number): BlockProjection => ({
  blockId: id, plotId: `plot-${id}`, commodityId: 'jagung',
  window: { start: utcDate(start), end: utcDate(end) }, expectedTonnes: tonnes,
})

describe('detectCollisions', () => {
  it('distributes tonnage across every week a window spans', () => {
    // 12–18 Oct is one ISO week; 15–21 straddles two.
    const { weeks } = detectCollisions([p('a', '2026-10-15', '2026-10-21', 70)], null)
    expect(weeks.length).toBe(2)
    const total = weeks.reduce((s, w) => s + w.tonnes, 0)
    expect(total).toBeCloseTo(70, 5)
  })

  it('conserves total tonnage across all buckets', () => {
    const { weeks } = detectCollisions(
      [p('a', '2026-10-05', '2026-10-12', 40), p('b', '2026-10-19', '2026-10-25', 60)], null)
    expect(weeks.reduce((s, w) => s + w.tonnes, 0)).toBeCloseTo(100, 5)
  })

  it('flags a week above the cooperative-set capacity and says so', () => {
    const { flagged } = detectCollisions(
      [p('a', '2026-10-12', '2026-10-18', 120)],
      new Map([['jagung', 80]]))
    expect(flagged).toHaveLength(1)
    expect(flagged[0].basis).toBe('capacity')
    expect(flagged[0].threshold).toBe(80)
  })

  it('falls back to 2.5x the median week when capacity is unset', () => {
    const flat = Array.from({ length: 6 }, (_, i) =>
      p(`f${i}`, `2026-09-${String(7 + i * 7).padStart(2, '0')}`,
        `2026-09-${String(7 + i * 7).padStart(2, '0')}`, 10))
    const spike = p('spike', '2026-11-02', '2026-11-02', 100)
    const { flagged } = detectCollisions([...flat, spike], null)
    expect(flagged.some(f => f.basis === 'median')).toBe(true)
  })

  it('flags nothing when the season is evenly spread', () => {
    const even = Array.from({ length: 8 }, (_, i) =>
      p(`e${i}`, `2026-09-${String(1 + i * 3).padStart(2, '0')}`,
        `2026-09-${String(1 + i * 3).padStart(2, '0')}`, 10))
    expect(detectCollisions(even, null).flagged).toHaveLength(0)
  })

  it('names the blocks contributing to a flagged week', () => {
    const { flagged } = detectCollisions(
      [p('a', '2026-10-12', '2026-10-14', 60), p('b', '2026-10-15', '2026-10-16', 60)],
      new Map([['jagung', 80]]))
    expect(flagged[0].contributingBlockIds.sort()).toEqual(['a', 'b'])
  })

  it('suggests shifts that bring the peak below threshold', () => {
    const { suggestions } = detectCollisions(
      [p('a', '2026-10-12', '2026-10-14', 60), p('b', '2026-10-15', '2026-10-16', 60)],
      new Map([['jagung', 80]]))
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions[0].resultingTonnes).toBeLessThanOrEqual(80)
    expect(Math.abs(suggestions[0].shiftDays)).toBeGreaterThanOrEqual(7)
    expect(Math.abs(suggestions[0].shiftDays)).toBeLessThanOrEqual(14)
  })

  it('returns empty results for no projections', () => {
    expect(detectCollisions([], null)).toEqual({ weeks: [], flagged: [], suggestions: [] })
  })
})

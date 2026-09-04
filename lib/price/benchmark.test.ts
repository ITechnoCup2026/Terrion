import { describe, expect, it } from 'vitest'

import { formatSeasonalGap, seasonalGap, type PriceBenchmark } from './benchmark'

function benchmark(latest: number, seasonal: number | null): PriceBenchmark {
  return {
    latest: { pricePerKg: latest, weekStart: new Date('2026-08-31T00:00:00Z') },
    seasonal: seasonal === null
      ? null
      : { pricePerKg: seasonal, weekStart: new Date('2025-11-03T00:00:00Z') },
    source: 'SINTETIS',
  }
}

describe('seasonalGap', () => {
  it('reports the harvest week above today as a positive fraction', () => {
    expect(seasonalGap(benchmark(5000, 5300))).toBeCloseTo(0.06)
  })

  it('reports the harvest week below today as a negative fraction', () => {
    expect(seasonalGap(benchmark(5000, 4800))).toBeCloseTo(-0.04)
  })

  it('has nothing to say without a seasonal week', () => {
    expect(seasonalGap(benchmark(5000, null))).toBeNull()
  })

  // A zero on the panel is bad data, and dividing by it would print a
  // confident percentage built on it.
  it('refuses to divide by a zero latest price', () => {
    expect(seasonalGap(benchmark(0, 4800))).toBeNull()
  })
})

describe('formatSeasonalGap', () => {
  it('signs a rise and a fall', () => {
    expect(formatSeasonalGap(0.06)).toBe('+6%')
    expect(formatSeasonalGap(-0.04)).toBe('−4%')
  })

  it('drops the sign when rounding lands on nothing', () => {
    expect(formatSeasonalGap(0.002)).toBe('0%')
    expect(formatSeasonalGap(-0.002)).toBe('0%')
  })
})

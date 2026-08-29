import { describe, it, expect } from 'vitest'
import { gddForDay, accumulateGdd, growthStage } from './gdd'

const day = (date: string, tmin: number, tmax: number) => ({ date, tmin, tmax })

describe('gddForDay', () => {
  it('is mean temperature minus base', () => {
    expect(gddForDay(day('2026-01-01', 20, 30), 10)).toBe(15)
  })
  it('never goes negative', () => {
    expect(gddForDay(day('2026-01-01', 2, 6), 10)).toBe(0)
  })
})

describe('accumulateGdd', () => {
  it('accumulates monotonically and returns one entry per day', () => {
    const series = accumulateGdd(
      [day('2026-01-01', 20, 30), day('2026-01-02', 20, 30), day('2026-01-03', 5, 5)], 10)
    expect(series.map(s => s.gdd)).toEqual([15, 30, 30])
    expect(series).toHaveLength(3)
  })
})

describe('growthStage', () => {
  it('maps GDD fraction to the five stages', () => {
    expect(growthStage(0, 1000)).toBe(0)
    expect(growthStage(149, 1000)).toBe(0)
    expect(growthStage(150, 1000)).toBe(1)
    expect(growthStage(499, 1000)).toBe(1)
    expect(growthStage(500, 1000)).toBe(2)
    expect(growthStage(849, 1000)).toBe(2)
    expect(growthStage(850, 1000)).toBe(3)
    expect(growthStage(999, 1000)).toBe(3)
    expect(growthStage(1000, 1000)).toBe(4)
    expect(growthStage(1500, 1000)).toBe(4)
  })
  it('returns stage 0 when the requirement is zero', () => {
    expect(growthStage(10, 0)).toBe(0)
  })
})

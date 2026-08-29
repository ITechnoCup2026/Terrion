import { describe, it, expect } from 'vitest'
import { fitCalibration } from './calibrate'
import { shrunkOffset } from './predict'
import { addDays, utcDate } from './dates'

const mid = utcDate('2026-10-14')
const obs = (lateBy: number) => ({ predictedMid: mid, actual: addDays(mid, lateBy) })

describe('fitCalibration', () => {
  it('returns a zero calibration with no observations', () => {
    expect(fitCalibration([])).toEqual({ offsetDays: 0, nObservations: 0, residualSd: 0 })
  })

  it('recovers a consistent +5 day bias', () => {
    const c = fitCalibration([obs(5), obs(5), obs(5), obs(5)])
    expect(c.offsetDays).toBeCloseTo(5, 5)
    expect(c.nObservations).toBe(4)
    expect(c.residualSd).toBeCloseTo(0, 5)
  })

  it('reports the spread as residualSd', () => {
    const c = fitCalibration([obs(3), obs(5), obs(7)])
    expect(c.offsetDays).toBeCloseTo(5, 5)
    expect(c.residualSd).toBeCloseTo(2, 5)
  })

  it('recovers a negative bias when harvest runs early', () => {
    const c = fitCalibration([obs(-4), obs(-6)])
    expect(c.offsetDays).toBeCloseTo(-5, 5)
  })

  it('shrinks a single observation heavily toward zero', () => {
    const c = fitCalibration([obs(8)])
    expect(shrunkOffset(c)).toBeCloseTo(2, 5)      // 8 × 1/(1+3)
  })

  it('barely shrinks a large sample', () => {
    const c = fitCalibration(Array.from({ length: 97 }, () => obs(8)))
    expect(shrunkOffset(c)).toBeCloseTo(7.76, 1)   // 8 × 97/100
  })
})

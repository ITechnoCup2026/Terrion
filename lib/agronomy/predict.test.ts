import { describe, it, expect } from 'vitest'
import { predictHarvest, isImplausible } from './predict'
import { utcDate, addDays, daysBetween, toISODate } from './dates'
import type { ClimateNormals, TempDay, Variety } from './types'

const VARIETY: Variety = {
  gddRequirement: 1400, baseTempC: 10,
  daysToHarvestMin: 90, daysToHarvestMax: 110,
  yieldPerHaMin: 7, yieldPerHaMax: 9.5,
}

// A flat 26 °C climate gives 16 GDD/day → 1400 GDD in ~88 days.
const normals: ClimateNormals = Array.from({ length: 366 }, (_, i) => ({
  dayOfYear: i + 1, meanC: 26, sdC: 2,
}))

function observedDays(from: Date, count: number, meanC = 26): TempDay[] {
  return Array.from({ length: count }, (_, i) => ({
    date: toISODate(addDays(from, i)), tmin: meanC - 4, tmax: meanC + 4,
  }))
}

const PLANTED = utcDate('2026-07-01')

describe('predictHarvest', () => {
  it('returns a window, never a point', () => {
    const w = predictHarvest({
      plantingDate: PLANTED, observed: [], forecast: [], climatology: normals, variety: VARIETY,
    })
    expect(w.end.getTime()).toBeGreaterThan(w.start.getTime())
    expect(w.confidence).toBe(0.8)
  })

  it('reports the thermal window untrimmed, even below the day floor', () => {
    // 1400 GDD at 27 °C is ~83 days, under VARIETY's own 90-day floor. The
    // floor is a catalogue description, not a physical limit, so it must not
    // move the answer — it only labels it.
    const w = predictHarvest({
      plantingDate: PLANTED, observed: [], forecast: [],
      climatology: equatorial, variety: VARIETY,
    })
    expect(daysBetween(PLANTED, w.start)).toBeLessThan(VARIETY.daysToHarvestMin)
  })

  it('narrows as observed weather replaces climatology', () => {
    const early = predictHarvest({
      plantingDate: PLANTED, observed: observedDays(PLANTED, 10),
      forecast: [], climatology: normals, variety: VARIETY,
    })
    const late = predictHarvest({
      plantingDate: PLANTED, observed: observedDays(PLANTED, 80),
      forecast: [], climatology: normals, variety: VARIETY,
    })
    const widthOf = (w: typeof early) => daysBetween(w.start, w.end)
    expect(widthOf(late)).toBeLessThanOrEqual(widthOf(early))
  })

  it('reports accumulated GDD and a cumulative series for the slider', () => {
    const w = predictHarvest({
      plantingDate: PLANTED, observed: observedDays(PLANTED, 10),
      forecast: [], climatology: normals, variety: VARIETY,
    })
    expect(w.gddAccumulated).toBeCloseTo(160, 0)   // 10 days × 16 GDD
    expect(w.gddRequired).toBe(1400)
    expect(w.cumulativeGdd.length).toBeGreaterThanOrEqual(10)
  })

  it('reports basis as observed once real weather exists', () => {
    expect(predictHarvest({
      plantingDate: PLANTED, observed: observedDays(PLANTED, 10),
      forecast: [], climatology: normals, variety: VARIETY,
    }).basis).toBe('observed')
    expect(predictHarvest({
      plantingDate: PLANTED, observed: [], forecast: [], climatology: normals, variety: VARIETY,
    }).basis).toBe('climatology')
  })

  it('does not double-count a day present in both observed and forecast', () => {
    // Weather providers hand back recent past days alongside the forecast. Summing
    // both series would accumulate GDD twice as fast and mature every crop early.
    const overlap = observedDays(PLANTED, 10)
    const w = predictHarvest({
      plantingDate: PLANTED, observed: overlap, forecast: overlap,
      climatology: normals, variety: VARIETY,
    })
    expect(w.gddAccumulated).toBeCloseTo(160, 0)
    expect(w.cumulativeGdd).toHaveLength(10)
  })

  it('shifts the window later under a positive calibration offset', () => {
    const base = predictHarvest({
      plantingDate: PLANTED, observed: [], forecast: [], climatology: normals, variety: VARIETY,
    })
    const shifted = predictHarvest({
      plantingDate: PLANTED, observed: [], forecast: [], climatology: normals, variety: VARIETY,
      calibration: { offsetDays: 8, nObservations: 30, residualSd: 0 },
    })
    expect(shifted.end.getTime()).toBeGreaterThanOrEqual(base.end.getTime())
  })

  it('barely shifts when the calibration has only one observation (shrinkage)', () => {
    const one = predictHarvest({
      plantingDate: PLANTED, observed: [], forecast: [], climatology: normals, variety: VARIETY,
      calibration: { offsetDays: 8, nObservations: 1, residualSd: 0 },
    })
    const many = predictHarvest({
      plantingDate: PLANTED, observed: [], forecast: [], climatology: normals, variety: VARIETY,
      calibration: { offsetDays: 8, nObservations: 100, residualSd: 0 },
    })
    expect(one.end.getTime()).toBeLessThan(many.end.getTime())
  })

  it('always yields start <= end', () => {
    for (const days of [0, 5, 40, 88, 120]) {
      const w = predictHarvest({
        plantingDate: PLANTED, observed: observedDays(PLANTED, days),
        forecast: [], climatology: normals, variety: VARIETY,
      })
      expect(w.start.getTime()).toBeLessThanOrEqual(w.end.getTime())
    }
  })
})

// A variety whose GDD requirement agrees with its day bounds at 27 °C:
// 1950 GDD at base 10 °C is ~115 days, inside [105, 125].
const RICE: Variety = {
  gddRequirement: 1950, baseTempC: 10,
  daysToHarvestMin: 105, daysToHarvestMax: 125,
  yieldPerHaMin: 5, yieldPerHaMax: 7,
}
const equatorial: ClimateNormals = Array.from({ length: 366 }, (_, i) => ({
  dayOfYear: i + 1, meanC: 27, sdC: 1,
}))

const flatNormals = (meanC: number, sdC = 1): ClimateNormals =>
  Array.from({ length: 366 }, (_, i) => ({ dayOfYear: i + 1, meanC, sdC }))

describe('plausibility against the variety day bounds', () => {
  const predictAt = (climatology: ClimateNormals, variety: Variety) =>
    predictHarvest({
      plantingDate: PLANTED, observed: [], forecast: [], climatology, variety,
    })

  it('reports ok when the thermal window agrees with the day bounds', () => {
    // 1950 GDD at 27 °C is ~116 days, inside RICE's [105, 125].
    const w = predictAt(equatorial, RICE)
    expect(w.plausibility).toBe('ok')
    expect(isImplausible(w)).toBe(false)
  })

  it('reports early when the model matures sooner than the catalogue says', () => {
    // ~83 days against a 90-day floor: a real prediction that mildly disagrees.
    const w = predictAt(equatorial, VARIETY)
    expect(w.plausibility).toBe('early')
    expect(isImplausible(w)).toBe(false)
  })

  it('reports late when the model matures later than the catalogue says', () => {
    // 1950 GDD at 24 °C is ~141 days against a 125-day ceiling.
    const w = predictAt(flatNormals(24), RICE)
    expect(w.plausibility).toBe('late')
    expect(isImplausible(w)).toBe(false)
  })

  it('flags implausible when the model runs far past the day ceiling', () => {
    // 1950 GDD at 22 °C is ~165 days — a lowland variety planted upland.
    const w = predictAt(flatNormals(22), RICE)
    expect(w.plausibility).toBe('implausible')
    expect(isImplausible(w)).toBe(true)
  })

  it('flags implausible when the model runs far under the day floor', () => {
    // 1400 GDD at 33 °C is ~62 days against a 90-day floor.
    const w = predictAt(flatNormals(33), VARIETY)
    expect(w.plausibility).toBe('implausible')
    expect(isImplausible(w)).toBe(true)
  })

  it('still returns a real window when the bounds disagree', () => {
    // The old clamp collapsed this case to a single date. It must stay a range.
    const w = predictAt(flatNormals(22), RICE)
    expect(w.end.getTime()).toBeGreaterThan(w.start.getTime())
  })

  it('flags implausible when the crop can never reach its GDD requirement', () => {
    // 5 °C never clears VARIETY's 10 °C base, so no heat ever accumulates.
    // The projection gives up — and giving up must not look like a confident date.
    const w = predictAt(flatNormals(5), VARIETY)
    expect(w.plausibility).toBe('implausible')
    expect(isImplausible(w)).toBe(true)
  })
})

describe('predictHarvest (bounds)', () => {
  it('still yields start <= end', () => {
    for (const days of [0, 5, 40, 88, 120]) {
      const w = predictHarvest({
        plantingDate: PLANTED, observed: observedDays(PLANTED, days),
        forecast: [], climatology: normals, variety: VARIETY,
      })
      expect(w.start.getTime()).toBeLessThanOrEqual(w.end.getTime())
    }
  })
})

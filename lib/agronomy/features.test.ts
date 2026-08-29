import { describe, it, expect } from 'vitest'
import { deriveYieldObservation, deriveYieldFeatures } from './features'
import { addDays, toISODate, utcDate } from './dates'
import type { TempDay, Variety } from './types'

const RICE: Variety = {
  gddRequirement: 2000, baseTempC: 12,
  daysToHarvestMin: 110, daysToHarvestMax: 125,
  yieldPerHaMin: 5, yieldPerHaMax: 7,
}

const PLANTED = utcDate('2025-01-01')

// A flat 27 C run of weather: 15 GDD/day above rice's 12 C base.
function flatWeather(from: Date, days: number, meanC = 27): TempDay[] {
  return Array.from({ length: days }, (_, i) => ({
    date: toISODate(addDays(from, i)), tmin: meanC - 5, tmax: meanC + 5,
  }))
}

const base = {
  plantingDate: PLANTED,
  harvestDate: addDays(PLANTED, 99),   // 100 days inclusive
  areaHa: 2,
  actualYieldKg: 12_000,
  variety: RICE,
}

describe('deriveYieldObservation', () => {
  it('computes the GDD ratio actually achieved over the growing period', () => {
    const o = deriveYieldObservation({ ...base, weather: flatWeather(PLANTED, 100) })
    // 100 days x 15 GDD = 1500, against a 2000 requirement.
    expect(o?.gddRatio).toBeCloseTo(0.75, 5)
  })

  it('converts kilograms into tonnes per hectare', () => {
    const o = deriveYieldObservation({ ...base, weather: flatWeather(PLANTED, 100) })
    // 12,000 kg on 2 ha is 6 t/ha.
    expect(o?.actualYieldPerHa).toBeCloseTo(6, 5)
    expect(o?.varietyBaselineYieldPerHa).toBeCloseTo(6, 5)   // (5 + 7) / 2
  })

  it('averages temperature over the growing period only', () => {
    // A scorching year either side of the season must not enter the average.
    const before = flatWeather(addDays(PLANTED, -30), 30, 40)
    const during = flatWeather(PLANTED, 100, 27)
    const after = flatWeather(addDays(PLANTED, 100), 30, 40)
    const o = deriveYieldObservation({ ...base, weather: [...before, ...during, ...after] })
    expect(o?.meanTempC).toBeCloseTo(27, 5)
  })

  it('counts only weather inside the growing period toward GDD', () => {
    const during = flatWeather(PLANTED, 100)
    const after = flatWeather(addDays(PLANTED, 100), 200)
    const o = deriveYieldObservation({ ...base, weather: [...during, ...after] })
    expect(o?.gddRatio).toBeCloseTo(0.75, 5)
  })

  it('returns null when no weather covers the growing period', () => {
    expect(deriveYieldObservation({ ...base, weather: [] })).toBeNull()
  })

  it('returns null for a zero-area block rather than dividing by it', () => {
    expect(deriveYieldObservation({
      ...base, areaHa: 0, weather: flatWeather(PLANTED, 100),
    })).toBeNull()
  })
})

describe('deriveYieldFeatures', () => {
  it('measures heat accumulated so far for a block still growing', () => {
    // Half a season in: 50 days x 15 GDD against a 2000 requirement.
    const f = deriveYieldFeatures({
      plantingDate: PLANTED, throughDate: addDays(PLANTED, 49),
      areaHa: 2, variety: RICE, weather: flatWeather(PLANTED, 100),
    })
    expect(f.gddRatio).toBeCloseTo(0.375, 5)
    expect(f.meanTempC).toBeCloseTo(27, 5)
    expect(f.varietyBaselineYieldPerHa).toBeCloseTo(6, 5)
  })

  it('reports zero heat when no weather has arrived yet', () => {
    // A block planted today has no season behind it; the model must still get
    // usable numbers rather than NaN.
    const f = deriveYieldFeatures({
      plantingDate: PLANTED, throughDate: PLANTED,
      areaHa: 1, variety: RICE, weather: [],
    })
    expect(f.gddRatio).toBe(0)
    expect(Number.isFinite(f.meanTempC)).toBe(true)
  })
})

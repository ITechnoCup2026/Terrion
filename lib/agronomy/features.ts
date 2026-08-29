// Turns a block and its weather into the numbers the yield model works in.
//
// A finished block becomes a training row; a growing one becomes a query. Both
// measure the same thing — heat actually received, and how warm the season ran.

import { toISODate } from './dates'
import { gddForDay } from './gdd'
import type { TempDay, Variety } from './types'
import type { YieldFeatures, YieldObservation } from './yield'

type Season = { gdd: number; meanTempC: number; days: number }

// Sum heat and average temperature over the days actually inside the season.
// Weather either side of it belongs to a different crop.
function summariseSeason(
  weather: TempDay[], variety: Variety, from: Date, to: Date,
): Season {
  const fromISO = toISODate(from)
  const toISO = toISODate(to)
  const season = weather.filter(d => d.date >= fromISO && d.date <= toISO)
  if (season.length === 0) return { gdd: 0, meanTempC: variety.baseTempC, days: 0 }

  return {
    gdd: season.reduce((s, d) => s + gddForDay(d, variety.baseTempC), 0),
    meanTempC: season.reduce((s, d) => s + (d.tmin + d.tmax) / 2, 0) / season.length,
    days: season.length,
  }
}

// The catalogue's expectation for this variety — the number the model corrects.
function baselineYield(variety: Variety): number {
  return (variety.yieldPerHaMin + variety.yieldPerHaMax) / 2
}

// One finished harvest, as a training row. Null when it cannot be scored.
export function deriveYieldObservation(input: {
  plantingDate: Date
  harvestDate: Date
  areaHa: number
  actualYieldKg: number
  variety: Variety
  weather: TempDay[]
}): YieldObservation | null {
  const { plantingDate, harvestDate, areaHa, actualYieldKg, variety, weather } = input
  if (areaHa <= 0 || variety.gddRequirement <= 0) return null

  const season = summariseSeason(weather, variety, plantingDate, harvestDate)
  // No weather for the season means no features; a row of zeroes would teach
  // the model that this yield came from no heat at all.
  if (season.days === 0) return null

  return {
    actualYieldPerHa: actualYieldKg / 1000 / areaHa,
    varietyBaselineYieldPerHa: baselineYield(variety),
    gddRatio: season.gdd / variety.gddRequirement,
    areaHa,
    meanTempC: season.meanTempC,
  }
}

// A block still in the ground, as a query. Always returns usable numbers: a
// block planted today has no season behind it but still needs a projection.
export function deriveYieldFeatures(input: {
  plantingDate: Date
  throughDate: Date
  areaHa: number
  variety: Variety
  weather: TempDay[]
}): YieldFeatures {
  const { plantingDate, throughDate, areaHa, variety, weather } = input
  const season = summariseSeason(weather, variety, plantingDate, throughDate)

  return {
    varietyBaselineYieldPerHa: baselineYield(variety),
    gddRatio: variety.gddRequirement > 0 ? season.gdd / variety.gddRequirement : 0,
    areaHa,
    meanTempC: season.meanTempC,
  }
}

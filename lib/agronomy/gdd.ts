// Growing degree days: the heat clock a crop actually grows on.

import type { GrowthStage, TempDay } from './types'

// One day's heat contribution — mean temperature above base, never negative.
export function gddForDay(day: TempDay, baseTempC: number): number {
  return Math.max(0, (day.tmax + day.tmin) / 2 - baseTempC)
}

// Running GDD total across a weather series, one entry per day.
export function accumulateGdd(days: TempDay[], baseTempC: number): { date: string; gdd: number }[] {
  let total = 0
  return days.map(d => {
    total += gddForDay(d, baseTempC)
    return { date: d.date, gdd: total }
  })
}

// How grown the crop looks, from the share of its GDD requirement it has met.
export function growthStage(accumulated: number, required: number): GrowthStage {
  if (required <= 0) return 0
  const f = accumulated / required
  if (f >= 1)    return 4
  if (f >= 0.85) return 3
  if (f >= 0.5)  return 2
  if (f >= 0.15) return 1
  return 0
}

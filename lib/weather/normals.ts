// Ten years of daily weather, collapsed into one typical year.
//
// mean_c is what the model walks forward on once the forecast runs out. sd_c is
// how much that day varies between years, and it is the entire source of the
// harvest window's width — a cell whose sd_c is zero predicts a single date.

import { dayOfYear, utcDate } from '@/lib/agronomy/dates'
import type { ClimateNormals, TempDay } from '@/lib/agronomy/types'

// Average each calendar day across the years available, and measure its spread.
export function deriveNormals(days: TempDay[]): ClimateNormals {
  // Leap years shift every day after February by one, so day 60 mixes 29 Feb
  // with 1 March. In the tropics that smear is far smaller than the day-to-day
  // noise it is averaging over.
  const byDayOfYear = new Map<number, number[]>()
  for (const d of days) {
    const doy = dayOfYear(utcDate(d.date))
    const dailyMean = (d.tmin + d.tmax) / 2
    const bucket = byDayOfYear.get(doy)
    if (bucket) bucket.push(dailyMean)
    else byDayOfYear.set(doy, [dailyMean])
  }

  return [...byDayOfYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([doy, means]) => {
      const meanC = means.reduce((s, x) => s + x, 0) / means.length
      // Sample SD (n-1), matching the convention in calibrate.ts. One year of
      // history gives zero spread, which is a data problem, not a real forecast.
      const sdC = means.length > 1
        ? Math.sqrt(means.reduce((s, x) => s + (x - meanC) ** 2, 0) / (means.length - 1))
        : 0
      return { dayOfYear: doy, meanC, sdC }
    })
}

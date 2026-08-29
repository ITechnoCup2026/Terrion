// L2: learn the model's bias from harvests that already happened.

import { daysBetween } from './dates'
import type { Calibration } from './types'

// Average signed error in days, plus its spread and the sample size behind it.
export function fitCalibration(
  observations: { predictedMid: Date; actual: Date }[],
): Calibration {
  const n = observations.length
  if (n === 0) return { offsetDays: 0, nObservations: 0, residualSd: 0 }

  const diffs = observations.map(o => daysBetween(o.predictedMid, o.actual))
  const mean = diffs.reduce((s, d) => s + d, 0) / n
  const variance = n > 1
    ? diffs.reduce((s, d) => s + (d - mean) ** 2, 0) / (n - 1)
    : 0

  return { offsetDays: mean, nObservations: n, residualSd: Math.sqrt(variance) }
}

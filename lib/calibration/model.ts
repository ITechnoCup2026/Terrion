import type { CalibrationRaw } from '@/lib/api/types'
import { formatNumberId } from '@/lib/format/number'

/**
 * What a cooperative's own recorded harvests have taught the predictor about
 * one variety.
 *
 * Two numbers, and the difference between them matters. `offsetDays` is what
 * the recorded harvests say on their own. `appliedOffsetDays` is how far the
 * prediction actually moves, after that estimate is shrunk toward the base
 * model in proportion to how few harvests back it -- so a cooperative with two
 * records gets a smaller correction than one with twenty, from the same raw
 * average.
 *
 * Both are carried because showing only the raw figure would overstate what the
 * product knows, and showing only the applied one would make a real measurement
 * look arbitrarily small.
 */
export type Calibration = {
  varietyId: string
  varietyName: string
  commodityName: string
  offsetDays: number
  appliedOffsetDays: number
  nObservations: number
  residualSd: number
}

export function toCalibration(raw: CalibrationRaw): Calibration {
  return {
    varietyId: raw.variety_id,
    varietyName: raw.variety_name,
    commodityName: raw.commodity_name,
    offsetDays: raw.offset_days,
    appliedOffsetDays: raw.applied_offset_days,
    nObservations: raw.n_observations,
    residualSd: raw.residual_sd,
  }
}

/** "Jagung Bisi-18", or whichever half of that the server could name. */
export function calibrationCrop(calibration: Calibration): string {
  return [calibration.commodityName, calibration.varietyName]
    .filter(Boolean).join(' ') || 'Varietas ini'
}

/**
 * How far a prediction moves, in words.
 *
 * A negative offset means the crop came in BEFORE the base model expected, so
 * the prediction is pulled earlier. Rounded to a whole day above ten, because
 * "12,4 hari lebih cepat" claims a precision a dozen harvests cannot support.
 *
 * Under half a day is reported as such rather than as "0 hari", which reads as
 * the model having found nothing when it has in fact found almost nothing.
 */
export function describeOffset(days: number): string {
  const size = Math.abs(days)
  if (size < 0.5) return 'kurang dari 1 hari'

  const figure = formatNumberId(size, size < 10 ? 1 : 0)
  return days < 0 ? `${figure} hari lebih cepat` : `${figure} hari lebih lambat`
}

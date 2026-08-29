// The L1 ensemble: two climate runs bracket when a block becomes harvestable.

import { addDays, dayOfYear, daysBetween, toISODate, utcDate } from './dates'
import { accumulateGdd, gddForDay, growthStage } from './gdd'
import type { Calibration, ClimateNormals, HarvestWindow, TempDay, Variety } from './types'

/** True 10th/90th percentiles of a normal. Spec §6.1 says "±1 SD" but also
 *  "P10/P90 · 80% confidence"; those disagree. 1.2816 makes the label true. */
export const Z_EARLY = 1.2816    // warm anomaly ⇒ earliest maturity ⇒ window start
export const Z_LATE = -1.2816    // cool anomaly ⇒ latest maturity  ⇒ window end
const SHRINKAGE_K = 3
const MAX_PROJECTION_DAYS = 400
// How far outside its published duration a variety may land before the answer
// is treated as broken input rather than an unusual season.
const BOUNDS_TOLERANCE = 0.25

// Pull a calibration offset toward zero when it rests on few harvests.
export function shrunkOffset(c: Calibration, k = SHRINKAGE_K): number {
  return c.offsetDays * (c.nObservations / (c.nObservations + k))
}

// The harvest window for one planting, given what weather is known so far.
export function predictHarvest(input: {
  plantingDate: Date
  observed: TempDay[]
  forecast: TempDay[]
  climatology: ClimateNormals
  variety: Variety
  calibration?: Calibration
}): HarvestWindow {
  const { plantingDate, climatology, variety, calibration } = input
  const plantedISO = toISODate(plantingDate)

  // One entry per calendar day. Providers return recent past days alongside the
  // forecast, and summing both would accumulate GDD twice as fast. Observed is
  // written second so a real reading always beats a forecast for the same day.
  const byDate = new Map<string, TempDay>()
  for (const d of input.forecast) if (d.date >= plantedISO) byDate.set(d.date, d)
  for (const d of input.observed) if (d.date >= plantedISO) byDate.set(d.date, d)
  const known = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))

  const cumulativeGdd = accumulateGdd(known, variety.baseTempC)
  const gddAccumulated = cumulativeGdd.at(-1)?.gdd ?? 0
  const gddRequired = variety.gddRequirement

  const normalByDoy = new Map(climatology.map(n => [n.dayOfYear, n]))

  /** Walk forward from the end of known weather under a persistent z anomaly
   *  until the GDD requirement is met. Returns days-after-planting. */
  function maturityDap(z: number): number {
    let total = gddAccumulated
    let cursor = known.length > 0 ? addDays(utcDate(known.at(-1)!.date), 1) : plantingDate
    if (total >= gddRequired) return Math.max(0, daysBetween(plantingDate, cursor) - 1)

    for (let i = 0; i < MAX_PROJECTION_DAYS; i++) {
      const n = normalByDoy.get(dayOfYear(cursor))
      const meanC = n ? n.meanC + z * n.sdC : variety.baseTempC
      total += gddForDay({ date: toISODate(cursor), tmin: meanC, tmax: meanC }, variety.baseTempC)
      if (total >= gddRequired) return daysBetween(plantingDate, cursor)
      cursor = addDays(cursor, 1)
    }
    // Never matured inside the search horizon. Report how far we actually
    // looked — borrowing the variety's ceiling here would dress a failed
    // search up as a confident harvest date.
    return MAX_PROJECTION_DAYS
  }

  let earlyDap = maturityDap(Z_EARLY)
  let lateDap = maturityDap(Z_LATE)

  if (calibration) {
    const shift = shrunkOffset(calibration)
    earlyDap += shift - calibration.residualSd
    lateDap += shift + calibration.residualSd
  }

  // The window is the model's own answer, never trimmed. days_to_harvest
  // describes how long the variety usually takes across many sites and seasons;
  // it is not a limit on this plot, and squashing a P10–P90 window into it
  // collapsed disagreements into a single date that looked certain.
  const startDap = Math.round(Math.min(earlyDap, lateDap))
  const endDap = Math.round(Math.max(earlyDap, lateDap))

  const plausibility = judgePlausibility((startDap + endDap) / 2, variety)

  const basis: HarvestWindow['basis'] =
    input.observed.some(d => d.date >= plantedISO) ? 'observed'
    : input.forecast.some(d => d.date >= plantedISO) ? 'forecast'
    : 'climatology'

  return {
    start: addDays(plantingDate, startDap),
    end: addDays(plantingDate, endDap),
    confidence: 0.8,
    gddAccumulated,
    gddRequired,
    stage: growthStage(gddAccumulated, gddRequired),
    basis,
    plausibility,
    cumulativeGdd,
  }
}

// Judge the model's midpoint against the variety's published duration. Inside
// the range agrees; just outside is a usable prediction that mildly disagrees;
// far outside means the inputs are wrong, not that the crop is unusual.
function judgePlausibility(midDap: number, variety: Variety): HarvestWindow['plausibility'] {
  const { daysToHarvestMin: lo, daysToHarvestMax: hi } = variety
  if (midDap >= lo && midDap <= hi) return 'ok'
  if (midDap < lo) return midDap >= lo * (1 - BOUNDS_TOLERANCE) ? 'early' : 'implausible'
  return midDap <= hi * (1 + BOUNDS_TOLERANCE) ? 'late' : 'implausible'
}

// True when the variety row or the weather feed disagrees with reality badly
// enough that callers should say the variety needs checking, not show a date.
export function isImplausible(w: HarvestWindow): boolean {
  return w.plausibility === 'implausible'
}

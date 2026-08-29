import { describe, it, expect } from 'vitest'
import { fitYieldModel, predictYieldPerHa } from './yield'
import type { YieldObservation } from './yield'

const BASELINE = 5.0        // t/ha, rice-ish
const TRUE_HEAT_EFFECT = 0.5 // a 10% GDD shortfall costs 5% of the yield

// Past harvests where yield depends only on how much heat the crop actually got.
// Area and temperature vary too, but carry no signal — the fit must ignore them.
function syntheticHistory(n: number): YieldObservation[] {
  return Array.from({ length: n }, (_, i) => {
    const gddRatio = 0.8 + ((i * 7) % 41) / 100      // spread over 0.80–1.20
    const index = 1 + TRUE_HEAT_EFFECT * (gddRatio - 1)
    return {
      actualYieldPerHa: BASELINE * index,
      varietyBaselineYieldPerHa: BASELINE,
      gddRatio,
      areaHa: 0.3 + ((i * 13) % 20) / 10,
      meanTempC: 24 + ((i * 11) % 60) / 10,
    }
  })
}

const at = (gddRatio: number, baseline = BASELINE) => ({
  varietyBaselineYieldPerHa: baseline, gddRatio, areaHa: 1.0, meanTempC: 27,
})

describe('fitYieldModel', () => {
  it('falls back to the catalogue yield when there is no history', () => {
    const model = fitYieldModel([])
    expect(model.nObservations).toBe(0)
    expect(predictYieldPerHa(model, at(1.0))).toBeCloseTo(BASELINE, 5)
  })

  it('recovers a yield relationship injected into the history', () => {
    // The whole point: hide a known effect in the data, confirm the fit finds it.
    // At gddRatio 1.2 the injected index is 1.10, so ~5.5 t/ha.
    const model = fitYieldModel(syntheticHistory(100))
    expect(predictYieldPerHa(model, at(1.2))).toBeCloseTo(BASELINE * 1.1, 1)
    expect(predictYieldPerHa(model, at(0.8))).toBeCloseTo(BASELINE * 0.9, 1)
  })

  it('shrinks toward the catalogue yield when few harvests support it', () => {
    const many = fitYieldModel(syntheticHistory(100))
    const few = fitYieldModel(syntheticHistory(100).slice(0, 6))
    const distance = (m: ReturnType<typeof fitYieldModel>) =>
      Math.abs(predictYieldPerHa(m, at(1.2)) - BASELINE)
    expect(distance(few)).toBeLessThan(distance(many))
  })

  it('reports near-zero residual spread on data with no noise', () => {
    expect(fitYieldModel(syntheticHistory(100)).residualSd).toBeLessThan(0.05)
  })

  it('survives a feature that never varies', () => {
    const flat = syntheticHistory(40).map(o => ({ ...o, areaHa: 1.0 }))
    const model = fitYieldModel(flat)
    expect(Number.isFinite(predictYieldPerHa(model, at(1.1)))).toBe(true)
  })

  it('scales its prediction by the variety baseline', () => {
    // The model learns a yield index, so one fit serves rice and potato alike.
    const model = fitYieldModel(syntheticHistory(100))
    const rice = predictYieldPerHa(model, at(1.1, 5))
    const potato = predictYieldPerHa(model, at(1.1, 20))
    expect(potato / rice).toBeCloseTo(4, 5)
  })

  it('never predicts a negative yield', () => {
    const model = fitYieldModel(syntheticHistory(100))
    expect(predictYieldPerHa(model, at(-5))).toBeGreaterThanOrEqual(0)
  })
})

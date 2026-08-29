// Learns what a hectare actually yields, versus what the seed catalogue promised.
//
// The target is a yield *index* — actual divided by the variety's advertised
// yield — so one fit serves every commodity: a 10% shortfall counts the same
// on 5 t/ha rice as on 25 t/ha potato. Ridge regression keeps the coefficients
// small, and the same shrinkage L2 uses keeps a handful of harvests from
// producing a confident-looking guess.

const FEATURES = ['gddRatio', 'areaHa', 'meanTempC'] as const
const RIDGE_LAMBDA = 1
const SHRINKAGE_K = 3

/** One past harvest: what the crop was given, and what it actually returned. */
export type YieldObservation = {
  actualYieldPerHa: number
  varietyBaselineYieldPerHa: number
  gddRatio: number
  areaHa: number
  meanTempC: number
}

/** The same inputs for a block that has not been harvested yet. */
export type YieldFeatures = {
  varietyBaselineYieldPerHa: number
  gddRatio: number
  areaHa: number
  meanTempC: number
}

/** Fitted coefficients plus the scaling they were fitted in, and how much
 *  history stands behind them. */
export type YieldModel = {
  meanIndex: number
  coefficients: number[]
  featureMeans: number[]
  featureSds: number[]
  nObservations: number
  residualSd: number
}

// Arithmetic mean of a list.
function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length
}

// Solve A x = b by Gauss-Jordan elimination with partial pivoting.
function solve(a: number[][], b: number[]): number[] {
  const k = b.length
  const m = a.map((row, i) => [...row, b[i]])
  for (let col = 0; col < k; col++) {
    let pivot = col
    for (let r = col + 1; r < k; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r
    }
    const tmp = m[col]
    m[col] = m[pivot]
    m[pivot] = tmp
    const d = m[col][col]
    if (Math.abs(d) < 1e-12) continue
    for (let r = 0; r < k; r++) {
      if (r === col) continue
      const factor = m[r][col] / d
      for (let c = col; c <= k; c++) m[r][c] -= factor * m[col][c]
    }
  }
  return m.map((row, i) => (Math.abs(row[i]) < 1e-12 ? 0 : row[k] / row[i]))
}

// Fit the yield index against past harvests. No history means no opinion.
export function fitYieldModel(
  observations: YieldObservation[],
  lambda = RIDGE_LAMBDA,
): YieldModel {
  const usable = observations.filter(o => o.varietyBaselineYieldPerHa > 0)
  const k = FEATURES.length
  if (usable.length === 0) {
    return {
      meanIndex: 1,
      coefficients: Array<number>(k).fill(0),
      featureMeans: Array<number>(k).fill(0),
      featureSds: Array<number>(k).fill(1),
      nObservations: 0,
      residualSd: 0,
    }
  }

  const n = usable.length
  const raw = usable.map(o => FEATURES.map(f => o[f]))
  const index = usable.map(o => o.actualYieldPerHa / o.varietyBaselineYieldPerHa)
  const meanIndex = mean(index)

  const featureMeans = FEATURES.map((_, j) => mean(raw.map(r => r[j])))
  const featureSds = FEATURES.map((_, j) => {
    const sd = Math.sqrt(mean(raw.map(r => (r[j] - featureMeans[j]) ** 2)))
    // A feature that never varies carries no information; neutralise it rather
    // than dividing by zero and poisoning every coefficient.
    return sd > 1e-9 ? sd : 1
  })

  const x = raw.map(r => r.map((v, j) => (v - featureMeans[j]) / featureSds[j]))
  const centred = index.map(v => v - meanIndex)

  const xtx = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => x.reduce((s, r) => s + r[i] * r[j], 0)))
  const xty = Array.from({ length: k }, (_, i) =>
    x.reduce((s, r, t) => s + r[i] * centred[t], 0))
  for (let j = 0; j < k; j++) xtx[j][j] += lambda

  const coefficients = solve(xtx, xty)

  const residuals = index.map((v, t) =>
    v - (meanIndex + x[t].reduce((s, f, j) => s + f * coefficients[j], 0)))
  const residualSd = n > 1
    ? Math.sqrt(residuals.reduce((s, d) => s + d * d, 0) / (n - 1))
    : 0

  return { meanIndex, coefficients, featureMeans, featureSds, nObservations: n, residualSd }
}

// Expected yield per hectare, pulled toward the catalogue when history is thin.
export function predictYieldPerHa(
  model: YieldModel,
  features: YieldFeatures,
  k = SHRINKAGE_K,
): number {
  const fitted = model.meanIndex + FEATURES.reduce((s, name, j) =>
    s + model.coefficients[j] * ((features[name] - model.featureMeans[j]) / model.featureSds[j]),
    0)
  const trust = model.nObservations / (model.nObservations + k)
  const index = 1 + (fitted - 1) * trust
  return Math.max(0, index * features.varietyBaselineYieldPerHa)
}

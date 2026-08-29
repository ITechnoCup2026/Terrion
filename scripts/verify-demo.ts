/**
 * Checks the demo's two closed loops after `pnpm demo:generate`.
 *
 *   pnpm demo:verify
 *
 * Each loop hides a known number in the synthetic data and confirms the model
 * finds it again. If either drifts, the model and the generator disagree and
 * one of them is wrong.
 */
import { createServiceClient } from '@/lib/supabase/server'
import { projectCooperative } from '@/lib/agronomy/project'
import { loadWeatherFor } from '@/lib/weather/sync'
import { deriveYieldObservation } from '@/lib/agronomy/features'
import { fitYieldModel, predictYieldPerHa } from '@/lib/agronomy/yield'
import { isImplausible } from '@/lib/agronomy/predict'
import { utcDate } from '@/lib/agronomy/dates'
import type { Variety } from '@/lib/agronomy/types'

async function main() {
  const db = createServiceClient()
  const { data: coop } = await db.from('cooperative')
    .select('id').eq('name', 'Koperasi Tani Subang Jaya').single()

  const { projections, windows } = await projectCooperative(coop!.id)
  const counts: Record<string, number> = {}
  for (const w of windows.values()) counts[w.plausibility] = (counts[w.plausibility] ?? 0) + 1
  const basis: Record<string, number> = {}
  for (const w of windows.values()) basis[w.basis] = (basis[w.basis] ?? 0) + 1

  console.log(`projectCooperative: ${projections.length} projections, ${windows.size} windows`)
  console.log('  plausibility:', JSON.stringify(counts))
  console.log('  basis:', JSON.stringify(basis))
  console.log('  implausible:', [...windows.values()].filter(isImplausible).length)
  console.log('  total expected tonnes:', projections.reduce((s, p) => s + p.expectedTonnes, 0).toFixed(1))

  // Refit the yield model and check it rediscovers the injected heat effect.
  const { data: plots } = await db.from('plot')
    .select('id, area_ha, grid_lat, grid_lng').eq('cooperative_id', coop!.id)
  const { data: blocks } = await db.from('block')
    .select('plot_id, variety_id, area_ha, planting_date, actual_harvest_date, actual_yield_kg')
    .in('plot_id', plots!.map(p => p.id))
  const { data: vrows } = await db.from('variety').select('*')
  const varieties = new Map<string, Variety>(vrows!.map(r => [r.id, {
    gddRequirement: Number(r.gdd_requirement), baseTempC: Number(r.base_temp_c),
    daysToHarvestMin: r.days_to_harvest_min, daysToHarvestMax: r.days_to_harvest_max,
    yieldPerHaMin: Number(r.yield_per_ha_min), yieldPerHaMax: Number(r.yield_per_ha_max),
  }]))
  const plotById = new Map(plots!.map(p => [p.id, p]))
  const weather = new Map<string, Awaited<ReturnType<typeof loadWeatherFor>>>()
  for (const p of plots!) {
    const k = `${Number(p.grid_lat)}|${Number(p.grid_lng)}`
    if (!weather.has(k)) weather.set(k, await loadWeatherFor(Number(p.grid_lat), Number(p.grid_lng), utcDate('2023-06-01')))
  }
  const observations = []
  for (const b of blocks!) {
    if (!b.actual_harvest_date || b.actual_yield_kg == null) continue
    const p = plotById.get(b.plot_id)!
    const o = deriveYieldObservation({
      plantingDate: utcDate(b.planting_date), harvestDate: utcDate(b.actual_harvest_date),
      areaHa: Number(b.area_ha), actualYieldKg: Number(b.actual_yield_kg),
      variety: varieties.get(b.variety_id)!,
      weather: weather.get(`${Number(p.grid_lat)}|${Number(p.grid_lng)}`)!.observed,
    })
    if (o) observations.push(o)
  }
  const model = fitYieldModel(observations)
  const probe = (gddRatio: number, meanTempC = 27) => predictYieldPerHa(model,
    { varietyBaselineYieldPerHa: 1, gddRatio, areaHa: 1, meanTempC })
  const probeTemp = (meanTempC: number) => probe(1.08, meanTempC)
  const ratios = observations.map(o => o.gddRatio).sort((a, b) => a - b)
  const temps = observations.map(o => o.meanTempC)
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
  const sd = (xs: number[]) => Math.sqrt(mean(xs.map(x => (x - mean(xs)) ** 2)))
  // Correlation between the two heat features: if they move together the fit
  // cannot tell which one carried the injected effect.
  const mr = mean(ratios), mt = mean(temps)
  const cov = mean(observations.map(o => (o.gddRatio - mr) * (o.meanTempC - mt)))
  console.log(`  gddRatio range ${ratios[0].toFixed(3)}-${ratios[ratios.length-1].toFixed(3)}, sd ${sd(ratios).toFixed(3)}`)
  console.log(`  corr(gddRatio, meanTempC) ${(cov / (sd(ratios) * sd(temps))).toFixed(3)}`)
  const inLo = ratios[Math.floor(ratios.length * 0.1)]
  const inHi = ratios[Math.floor(ratios.length * 0.9)]
  console.log(`  within training range: index at ${inLo.toFixed(3)} -> ${probe(inLo).toFixed(3)}, ` +
    `at ${inHi.toFixed(3)} -> ${probe(inHi).toFixed(3)}, ` +
    `effect ${((probe(inHi) - probe(inLo)) / (inHi - inLo)).toFixed(3)}`)
  // Raw OLS slope of index on gddRatio, straight from the data. If this is 0.5
  // the model lost the signal; if it is not, the generator never injected it.
  const idx = observations.map(o => o.actualYieldPerHa / o.varietyBaselineYieldPerHa)
  const mi = mean(idx)
  const slope = mean(observations.map((o, k) => (o.gddRatio - mr) * (idx[k] - mi)))
    / mean(observations.map(o => (o.gddRatio - mr) ** 2))
  console.log(`  raw OLS slope of index on gddRatio: ${slope.toFixed(3)} (injected 0.5)`)
  const tLo = 25.5, tHi = 28.5
  const tempEffect = (probeTemp(tHi) - probeTemp(tLo)) / (tHi - tLo)
  console.log(`  temp penalty recovered: ${(-tempEffect).toFixed(4)} per C (injected 0.04)`)
  console.log(`    index at ${tLo}C -> ${probeTemp(tLo).toFixed(3)}, at ${tHi}C -> ${probeTemp(tHi).toFixed(3)}`)
  const lo = probe(0.8), hi = probe(1.2)
  console.log(`\nyield model: ${model.nObservations} training rows, residualSd ${model.residualSd.toFixed(3)}`)
  console.log(`  index at gddRatio 0.8 -> ${lo.toFixed(3)}, at 1.2 -> ${hi.toFixed(3)}`)
  console.log(`  recovered heat effect ${(((hi - lo) / 0.4)).toFixed(3)} (injected 0.5)`)

}
main().catch(e => { console.error(e); process.exit(1) })

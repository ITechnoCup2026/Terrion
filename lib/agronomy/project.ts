// Assembles one cooperative's whole picture: a harvest window and an expected
// tonnage for every block still in the ground.
//
// Blocks already harvested are not projected — they train the yield model that
// scores the ones that are. Weather is fetched once per grid cell, not per plot.

import { createServiceClient } from '@/lib/supabase/server'
import { loadWeatherFor } from '@/lib/weather/sync'
import { toISODate, utcDate } from './dates'
import { deriveYieldFeatures, deriveYieldObservation } from './features'
import { predictHarvest } from './predict'
import { fitYieldModel, predictYieldPerHa } from './yield'
import type { BlockProjection, Calibration, HarvestWindow, Variety } from './types'
import type { YieldObservation } from './yield'

const PAGE = 1000

type Page<T> = { data: T[] | null; error: { message: string } | null }

// Read every row, not the first thousand. PostgREST caps an unpaged select.
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<Page<T>>, what: string,
): Promise<T[]> {
  const all: T[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await page(offset, offset + PAGE - 1)
    if (error) throw new Error(`${what} failed: ${error.message}`)
    all.push(...(data ?? []))
    if (!data || data.length < PAGE) return all
  }
}

// The variety table stores numerics that PostgREST may hand back as strings.
function toVariety(row: {
  gdd_requirement: number; base_temp_c: number
  days_to_harvest_min: number; days_to_harvest_max: number
  yield_per_ha_min: number; yield_per_ha_max: number
}): Variety {
  return {
    gddRequirement: Number(row.gdd_requirement),
    baseTempC: Number(row.base_temp_c),
    daysToHarvestMin: Number(row.days_to_harvest_min),
    daysToHarvestMax: Number(row.days_to_harvest_max),
    yieldPerHaMin: Number(row.yield_per_ha_min),
    yieldPerHaMax: Number(row.yield_per_ha_max),
  }
}

const cellKey = (lat: number, lng: number) => `${lat}|${lng}`

// Every block's harvest window and expected tonnage for one cooperative.
export async function projectCooperative(
  cooperativeId: string, now = new Date(),
): Promise<{ projections: BlockProjection[]; windows: Map<string, HarvestWindow> }> {
  const db = createServiceClient()
  const today = toISODate(now)

  const plots = await fetchAll((from, to) => db.from('plot')
    .select('id, area_ha, grid_lat, grid_lng')
    .eq('cooperative_id', cooperativeId).range(from, to), 'plot read')
  if (plots.length === 0) return { projections: [], windows: new Map() }

  const plotById = new Map(plots.map(p => [p.id, p]))
  const plotIds = plots.map(p => p.id)

  const blocks = await fetchAll((from, to) => db.from('block')
    .select('id, plot_id, commodity_id, variety_id, area_ha, planting_date, actual_harvest_date, actual_yield_kg')
    .in('plot_id', plotIds).range(from, to), 'block read')
  if (blocks.length === 0) return { projections: [], windows: new Map() }

  const varieties = new Map((await fetchAll((from, to) => db.from('variety')
    .select('*').in('id', [...new Set(blocks.map(b => b.variety_id))]).range(from, to),
    'variety read')).map(v => [v.id, toVariety(v)]))

  const calibrations = new Map((await fetchAll((from, to) => db.from('calibration')
    .select('variety_id, offset_days, n_observations, residual_sd')
    .eq('cooperative_id', cooperativeId).range(from, to), 'calibration read'))
    .map(c => [c.variety_id, {
      offsetDays: Number(c.offset_days),
      nObservations: Number(c.n_observations),
      residualSd: Number(c.residual_sd),
    } satisfies Calibration]))

  // Weather has to reach back to the oldest planting date, or blocks from past
  // seasons cannot be scored and the yield model loses its training rows.
  const earliest = blocks.reduce(
    (min, b) => (b.planting_date < min ? b.planting_date : min), blocks[0].planting_date)

  type CellWeather = Awaited<ReturnType<typeof loadWeatherFor>>
  const weatherByCell = new Map<string, CellWeather>()
  for (const plot of plots) {
    if (plot.grid_lat == null || plot.grid_lng == null) continue
    const key = cellKey(Number(plot.grid_lat), Number(plot.grid_lng))
    if (weatherByCell.has(key)) continue
    weatherByCell.set(key, await loadWeatherFor(
      Number(plot.grid_lat), Number(plot.grid_lng), utcDate(earliest), now))
  }

  const weatherForPlot = (plotId: string) => {
    const plot = plotById.get(plotId)
    if (!plot || plot.grid_lat == null || plot.grid_lng == null) return null
    return weatherByCell.get(cellKey(Number(plot.grid_lat), Number(plot.grid_lng))) ?? null
  }

  // Finished blocks become training rows for the yield model.
  const observations: YieldObservation[] = []
  for (const b of blocks) {
    if (!b.actual_harvest_date || b.actual_yield_kg == null) continue
    const variety = varieties.get(b.variety_id)
    const weather = weatherForPlot(b.plot_id)
    if (!variety || !weather) continue
    const observation = deriveYieldObservation({
      plantingDate: utcDate(b.planting_date),
      harvestDate: utcDate(b.actual_harvest_date),
      areaHa: Number(b.area_ha),
      actualYieldKg: Number(b.actual_yield_kg),
      variety,
      weather: weather.observed,
    })
    if (observation) observations.push(observation)
  }
  // With no history this returns a model that predicts the catalogue yield
  // exactly, which is the flat lookup this replaced.
  const yieldModel = fitYieldModel(observations)

  const projections: BlockProjection[] = []
  const windows = new Map<string, HarvestWindow>()

  for (const b of blocks) {
    if (b.actual_harvest_date) continue          // already in, nothing to predict
    const variety = varieties.get(b.variety_id)
    const weather = weatherForPlot(b.plot_id)
    if (!variety || !weather) continue

    // Stored weather holds both past readings and the 16-day forecast. Split
    // on today so the window reports an honest basis instead of calling a
    // forecast an observation.
    const observed = weather.observed.filter(d => d.date <= today)
    const forecast = weather.observed.filter(d => d.date > today)

    const window = predictHarvest({
      plantingDate: utcDate(b.planting_date),
      observed, forecast,
      climatology: weather.normals,
      variety,
      calibration: calibrations.get(b.variety_id),
    })

    const areaHa = Number(b.area_ha)
    const yieldPerHa = predictYieldPerHa(yieldModel, deriveYieldFeatures({
      plantingDate: utcDate(b.planting_date),
      throughDate: now,
      areaHa,
      variety,
      weather: observed,
    }))

    windows.set(b.id, window)
    projections.push({
      blockId: b.id,
      plotId: b.plot_id,
      commodityId: b.commodity_id,
      window: { start: window.start, end: window.end },
      expectedTonnes: yieldPerHa * areaHa,
    })
  }

  return { projections, windows }
}

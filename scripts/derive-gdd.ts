/**
 * Throwaway: derives the gdd_requirement each seeded variety would need for its
 * published days_to_harvest range to hold at the demo's actual grid cells.
 *
 *   pnpm tsx --env-file=.env scripts/derive-gdd.ts
 *
 * The seed's GDD figures are literature values from cooler reference climates.
 * Subang's cells are warmer, so the crop banks degree-days faster and matures
 * before the published window — every padi block reads 'late'. This prints the
 * GDD that puts each variety's midpoint back inside its own stated range.
 */
import { createServiceClient } from '@/lib/supabase/server'

import { gddForDay } from '@/lib/agronomy/gdd'
import { utcDate, daysBetween } from '@/lib/agronomy/dates'
import { predictHarvest } from '@/lib/agronomy/predict'

// Accumulate GDD across `days` calendar days from a planting day-of-year, using
// the cell's climate normals as the daily temperature.
function gddOverDays(
  normals: { dayOfYear: number; meanC: number }[],
  baseTemp: number,
  plantingDoy: number,
  days: number,
): number {
  const byDoy = new Map(normals.map(n => [n.dayOfYear, n.meanC]))
  let total = 0
  for (let i = 0; i < days; i++) {
    const doy = ((plantingDoy - 1 + i) % 365) + 1
    const meanC = byDoy.get(doy) ?? 0
    total += gddForDay({ date: '2020-01-01', tmin: meanC, tmax: meanC }, baseTemp)
  }
  return total
}

// The grid cell whose climate each commodity is actually farmed in, taken from
// where the demo generator plants it — padi and jagung in the Subang lowland,
// kentang, wortel and beri on the Jalancagak highland shoulder.
const LOWLAND = '-6.25,107.75'
const HIGHLAND = '-6.75,107.75'
const REFERENCE_CELL: Record<string, string> = {
  padi: LOWLAND, jagung: LOWLAND, generik: LOWLAND,
  cabai: '-6.5,107.75',
  kentang: HIGHLAND, wortel: HIGHLAND, beri: HIGHLAND,
}

async function main() {
  const db = createServiceClient()

  // Distinct grid cells come from the plots themselves; weather_normals is
  // already derived and stored, so there is nothing to recompute here.
  const { data: plots } = await db.from('plot').select('grid_lat, grid_lng')
  const uniq = [...new Set((plots ?? []).map(c => `${Number(c.grid_lat)},${Number(c.grid_lng)}`))].sort()
  console.log('grid cells:', uniq)

  const cellNormals: Record<string, { dayOfYear: number; meanC: number; sdC: number }[]> = {}
  for (const key of uniq) {
    const [lat, lng] = key.split(',').map(Number)
    const { data: rows } = await db.from('weather_normals')
      .select('day_of_year, mean_c, sd_c')
      .eq('grid_lat', lat).eq('grid_lng', lng)
      .order('day_of_year').limit(400)
    const normals = (rows ?? []).map(r => ({
      dayOfYear: r.day_of_year, meanC: Number(r.mean_c), sdC: Number(r.sd_c),
    }))
    cellNormals[key] = normals
    const mean = normals.reduce((s, n) => s + n.meanC, 0) / normals.length
    const lo = Math.min(...normals.map(n => n.meanC))
    const hi = Math.max(...normals.map(n => n.meanC))
    const sd = normals.reduce((s, n) => s + n.sdC, 0) / normals.length
    console.log(`  ${key}: ${normals.length} days, annual mean ${mean.toFixed(2)} C, range ${lo.toFixed(2)}-${hi.toFixed(2)}, mean sd ${sd.toFixed(2)}`)
  }

  const { data: varieties } = await db.from('variety')
    .select('name, gdd_requirement, base_temp_c, days_to_harvest_min, days_to_harvest_max, commodity(slug)')
    .order('name')

  const suggestions: Record<string, number> = {}
  console.log('\nvariety                 base  dtm     current  ' + uniq.map(k => k.padEnd(9)).join('') + ' suggested')
  for (const v of varieties ?? []) {
    const base = Number(v.base_temp_c)
    const lo = v.days_to_harvest_min, hi = v.days_to_harvest_max
    const mid = Math.round((lo + hi) / 2)
    const perCell: number[] = []
    for (const key of uniq) {
      // Average over four plantings a quarter apart so a monsoon-timed planting
      // does not set the varietal constant on its own.
      const samples = [1, 92, 183, 274].map(doy => gddOverDays(cellNormals[key], base, doy, mid))
      perCell.push(samples.reduce((s, x) => s + x, 0) / samples.length)
    }
    // Each commodity is grown at its own elevation in Java; derive its varietal
    // constant at the temperature it actually experiences, not at a district mean.
    const slug = (v.commodity as never as { slug: string }).slug
    const ref = REFERENCE_CELL[slug] ?? LOWLAND
    const suggested = Math.round(perCell[uniq.indexOf(ref)] / 5) * 5
    console.log(
      `${v.name.padEnd(22)} ${String(base).padEnd(5)} ${`${lo}-${hi}`.padEnd(8)}` +
      `${String(v.gdd_requirement).padEnd(9)}` +
      perCell.map(g => Math.round(g).toString().padEnd(9)).join('') +
      `${suggested}`
    )
    suggestions[v.name] = suggested
  }

  await check(db, cellNormals, suggestions)
}

// Replay the suggested GDD through the real maturity walk and report where the
// window midpoint lands against the variety's published range.
async function check(db: ReturnType<typeof createServiceClient>,
                    cellNormals: Record<string, { dayOfYear: number; meanC: number; sdC: number }[]>,
                    suggestions: Record<string, number>) {
  const { data: varieties } = await db.from('variety')
    .select('name, gdd_requirement, base_temp_c, days_to_harvest_min, days_to_harvest_max')
    .order('name')
  console.log('\nplausibility of the SUGGESTED values, per cell (planting 1 Nov):')
  for (const v of varieties ?? []) {
    const base = Number(v.base_temp_c)
    const lo = v.days_to_harvest_min, hi = v.days_to_harvest_max
    const target = suggestions[v.name]
    const cells = Object.keys(cellNormals).sort()
    const out: string[] = []
    for (const key of cells) {
      const w = predictHarvest({
        plantingDate: utcDate('2025-11-01'),
        observed: [], forecast: [],
        climatology: cellNormals[key],
        variety: { id: 'x', name: v.name, gddRequirement: target, baseTempC: base,
                   daysToHarvestMin: lo, daysToHarvestMax: hi,
                   yieldPerHaMin: 1, yieldPerHaMax: 2 } as never,
      })
      const dap = Math.round((daysBetween(utcDate('2025-11-01'), w.start)
                            + daysBetween(utcDate('2025-11-01'), w.end)) / 2)
      out.push(`${String(dap).padStart(3)}d ${w.plausibility.padEnd(11)}`)
    }
    console.log(`${v.name.padEnd(22)} ${`${lo}-${hi}`.padEnd(8)} gdd ${String(target).padEnd(6)} ${out.join(' ')}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })

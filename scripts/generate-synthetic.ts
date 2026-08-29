/**
 * Deterministic synthetic cooperative for the demo.
 *
 *   pnpm demo:generate
 *
 * Every value comes from a seeded PRNG, so the same data appears on every
 * machine — judges run this themselves. Nothing here may use Math.random.
 *
 * The point of the exercise is the closed loop: past harvests are written a
 * known number of days late, and L2 has to rediscover that number from them.
 * The same trick hides a heat-to-yield relationship for the yield model.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { createRng } from '@/lib/rng'
import { snapToGrid } from '@/lib/weather/grid'
import { backfillPlotGrid, loadWeatherFor } from '@/lib/weather/sync'
import { predictHarvest } from '@/lib/agronomy/predict'
import { fitCalibration } from '@/lib/agronomy/calibrate'
import { detectCollisions } from '@/lib/agronomy/collide'
import { gddForDay } from '@/lib/agronomy/gdd'
import { addDays, daysBetween, isoWeekKey, toISODate, utcDate } from '@/lib/agronomy/dates'
import type { BlockProjection, ClimateNormals, TempDay, Variety } from '@/lib/agronomy/types'
import type { Database } from '@/lib/supabase/types.gen'

type BlockInsert = Database['public']['Tables']['block']['Insert']

const SEED = 20260825
const INJECTED_BIAS_DAYS = 5          // L2 must rediscover this
const INJECTED_YIELD_HEAT_EFFECT = 0.5   // yield index per unit of GDD adequacy
/** Yield lost per degree of season mean above the optimum. Real: rice fills
 *  grain poorly when nights stay warm. This carries most of the signal, because
 *  gddRatio is ~1 by construction -- harvest happens when the GDD target is met. */
const INJECTED_TEMP_PENALTY = 0.04
const YIELD_OPTIMUM_C = 26
const YIELD_NOISE_SD = 0.02
const PLOT_COUNT = 47
const COLLIDING_PLOTS = 19
const COOP_NAME = 'Koperasi Tani Subang Jaya'
/** Staff who must be able to sign in to this cooperative after a regeneration.
 *  Their auth users are created by scripts/seed-test-users.mjs. */
const PROVINCE = 'Jawa Barat'

/** Chosen on measured Open-Meteo data; see Task B7 step 2 in the plan. */
const VILLAGES = [
  { name: 'Pamanukan',  lat: -6.2833, lng: 107.8167, crops: ['padi', 'padi', 'padi', 'jagung'] },
  { name: 'Subang',     lat: -6.5710, lng: 107.7600, crops: ['padi', 'padi', 'jagung', 'cabai'] },
  { name: 'Jalancagak', lat: -6.7200, lng: 107.6600, crops: ['wortel', 'kentang', 'cabai', 'beri'] },
] as const

const NAMES = [
  'Asep', 'Dedi', 'Euis', 'Wawan', 'Nengsih', 'Ujang', 'Iis', 'Cecep', 'Yayah', 'Endang',
  'Rohman', 'Titin', 'Dadang', 'Imas', 'Agus', 'Nani', 'Tatang', 'Elin', 'Jajang', 'Wati',
]
const SURNAMES = ['Suryana', 'Rohaeti', 'Permana', 'Hidayat', 'Nurjanah', 'Setiawan', 'Kurnia']

const rng = createRng(SEED)
const db = createServiceClient()

function fail(what: string, error: { message: string } | null): void {
  if (error) throw new Error(`${what}: ${error.message}`)
}

// Mean temperature over a block's season.
function meanTempBetween(weather: TempDay[], from: Date, to: Date): number {
  const fromISO = toISODate(from)
  const toISO = toISODate(to)
  const days = weather.filter(d => d.date >= fromISO && d.date <= toISO)
  if (days.length === 0) return YIELD_OPTIMUM_C
  return days.reduce((s, d) => s + (d.tmin + d.tmax) / 2, 0) / days.length
}

// Sum the heat a block actually received between two dates.
function gddBetween(weather: TempDay[], variety: Variety, from: Date, to: Date): number {
  const fromISO = toISODate(from)
  const toISO = toISODate(to)
  return weather
    .filter(d => d.date >= fromISO && d.date <= toISO)
    .reduce((s, d) => s + gddForDay(d, variety.baseTempC), 0)
}

/**
 * Re-attach the demo cooperative's sign-in accounts.
 *
 * Deleting the cooperative cascades to app_user, so every regeneration strips
 * the profile from anyone who could sign in to it -- leaving a catalogue full
 * of listings and no one able to answer a request. The auth users survive, so
 * this rebuilds their app_user rows.
 */
/**
 * Where this run should write.
 *
 * With TERRION_SEED_COOPERATIVE_ID set (scripts/seed.ts sets it after signing
 * somebody in), the generator fills that cooperative instead of creating its
 * own: its members and plots are cleared and rebuilt, but the cooperative row
 * and the accounts attached to it survive, because deleting it would cascade
 * away the app_user rows of the person who just signed in.
 *
 * Without it, the original behaviour: delete and recreate the demo cooperative.
 */
async function resolveTarget(): Promise<{ id: string; name: string; owned: boolean }> {
  const targetId = process.env.TERRION_SEED_COOPERATIVE_ID
  if (targetId) {
    const { data, error } = await db.from('cooperative')
      .select('id, name').eq('id', targetId).maybeSingle()
    fail('read target cooperative', error)
    if (!data) throw new Error(`No cooperative with id ${targetId}`)

    // Members cascade to plots and plots to blocks, so this empties the
    // cooperative's land without touching the cooperative or its accounts.
    fail('clear members', (await db.from('member').delete().eq('cooperative_id', data.id)).error)
    fail('clear plots', (await db.from('plot').delete().eq('cooperative_id', data.id)).error)
    return { id: data.id, name: data.name, owned: false }
  }

  fail('wipe previous run', (await db.from('cooperative').delete().eq('name', COOP_NAME)).error)
  const { data: coop, error: coopError } = await db.from('cooperative').insert({
    name: COOP_NAME, village: 'Pamanukan', district: 'Kabupaten Subang',
    province: PROVINCE, lat: VILLAGES[0].lat, lng: VILLAGES[0].lng,
  }).select('id').single()
  fail('insert cooperative', coopError)
  return { id: coop!.id, name: COOP_NAME, owned: true }
}

async function main() {
  const startedAt = Date.now()
  const target = await resolveTarget()

  // public_id is globally unique, so the prefix has to identify the
  // cooperative. The demo cooperative keeps SBG- because docs, the demo script
  // and /garden/SBG-0001 all name it; anything else derives four characters
  // from its own id, which is stable across re-runs of the same cooperative.
  const publicPrefix = target.owned
    ? 'SBG'
    : target.id.replace(/-/g, '').slice(0, 4).toUpperCase()
  console.log(`Seed ${SEED} — filling "${target.name}"`)
  const cooperativeId = target.id

  // --- weather, once per grid cell -----------------------------------------
  const cells = new Map<string, { gridLat: number; gridLng: number }>()
  for (const v of VILLAGES) {
    const cell = snapToGrid(v.lat, v.lng)
    cells.set(`${cell.gridLat}|${cell.gridLng}`, cell)
  }
  console.log(`Backfilling ${cells.size} grid cells…`)
  for (const cell of cells.values()) {
    const { skipped, rows } = await backfillPlotGrid(cell.gridLat, cell.gridLng)
    console.log(`  ${cell.gridLat},${cell.gridLng}: ${skipped ? 'already present' : `${rows} days`}`)
  }

  const weatherByCell = new Map<string, { observed: TempDay[]; normals: ClimateNormals }>()
  for (const [key, cell] of cells) {
    weatherByCell.set(key, await loadWeatherFor(
      cell.gridLat, cell.gridLng, utcDate('2023-06-01')))
  }

  // --- reference data ------------------------------------------------------
  const { data: commodities, error: cErr } = await db.from('commodity').select('id, slug')
  fail('read commodity', cErr)
  const commodityBySlug = new Map(commodities!.map(c => [c.slug, c.id]))

  const { data: varietyRows, error: vErr } = await db.from('variety').select('*')
  fail('read variety', vErr)
  const varietiesByCommodity = new Map<string, { id: string; v: Variety }[]>()
  for (const r of varietyRows!) {
    const v: Variety = {
      gddRequirement: Number(r.gdd_requirement), baseTempC: Number(r.base_temp_c),
      daysToHarvestMin: r.days_to_harvest_min, daysToHarvestMax: r.days_to_harvest_max,
      yieldPerHaMin: Number(r.yield_per_ha_min), yieldPerHaMax: Number(r.yield_per_ha_max),
    }
    const list = varietiesByCommodity.get(r.commodity_id) ?? []
    list.push({ id: r.id, v })
    varietiesByCommodity.set(r.commodity_id, list)
  }

  const { data: prices, error: pErr } = await db.from('reference_price')
    .select('commodity_id, week_start, price_per_kg').eq('province', PROVINCE)
  fail('read reference_price', pErr)
  const priceByWeek = new Map(
    (prices ?? []).map(p =>
      [`${p.commodity_id}|${isoWeekKey(utcDate(p.week_start))}`, Number(p.price_per_kg)]),
  )

  // The reference for the week a harvest falls in. computeImpact scores a block
  // against its containing week, so pricing it off the nearest week_start would
  // put roughly half the harvests (Thu-Sun) a week out and read as a price gap
  // the cooperative never had. Nearest is kept only for a date the seed does not
  // cover, so a shorter reference series degrades instead of crashing.
  const priceForWeek = (commodityId: string, when: Date): number => {
    const exact = priceByWeek.get(`${commodityId}|${isoWeekKey(when)}`)
    if (exact != null) return exact

    const rows = (prices ?? []).filter(p => p.commodity_id === commodityId)
    if (rows.length === 0) return 5000
    const target = when.getTime()
    const best = rows.reduce((a, b) =>
      Math.abs(utcDate(a.week_start).getTime() - target) <=
      Math.abs(utcDate(b.week_start).getTime() - target) ? a : b)
    return Number(best.price_per_kg)
  }

  // --- members and plots ---------------------------------------------------
  // Names must be distinct: the RDKK is filed per farmer, and two rows reading
  // "Asep Hidayat" cannot be told apart by whoever signs the form. Drawing at
  // random from 20x7 combinations collides often at 24 draws, so the pairs are
  // walked deterministically instead.
  const memberNames: string[] = []
  for (let i = 0; memberNames.length < 24; i++) {
    const name = `${NAMES[i % NAMES.length]} ${SURNAMES[Math.floor(i / NAMES.length) % SURNAMES.length]}`
    if (!memberNames.includes(name)) memberNames.push(name)
  }
  const memberRows = memberNames.map(name => ({ cooperative_id: cooperativeId, name }))
  const { data: members, error: mErr } =
    await db.from('member').insert(memberRows).select('id')
  fail('insert members', mErr)

  const plotVillages: (typeof VILLAGES)[number]['name'][] = []
  const plotRows = Array.from({ length: PLOT_COUNT }, (_, i) => {
    // The collision group all sits in one lowland village so its windows can
    // actually coincide; the rest spread across all three.
    const village = i < COLLIDING_PLOTS
      ? VILLAGES[0]
      : VILLAGES[(i - COLLIDING_PLOTS) % VILLAGES.length]
    plotVillages.push(village.name)
    // Log-normal-ish areas: many smallholdings, a few larger fields.
    const area = Math.min(2.5, Math.max(0.2, Math.exp(rng.normal(-0.7, 0.6))))
    return {
      cooperative_id: cooperativeId,
      member_id: rng.pick(members!).id,
      public_id: `${publicPrefix}-${String(i + 1).padStart(4, '0')}`,
      name: `${village.name} ${i + 1}`,
      area_ha: Number(area.toFixed(4)),
      lat: Number((village.lat + rng.uniform(-0.02, 0.02)).toFixed(6)),
      lng: Number((village.lng + rng.uniform(-0.02, 0.02)).toFixed(6)),
    }
  })
  const { data: plots, error: plErr } = await db.from('plot')
    .insert(plotRows).select('id, area_ha, grid_lat, grid_lng')
  fail('insert plots', plErr)

  const plotVillage = new Map(plots!.map((p, i) => [p.id, plotVillages[i]]))
  const villageByName = new Map(VILLAGES.map(v => [v.name, v]))

  // --- blocks --------------------------------------------------------------
  type PastPair = { varietyId: string; predictedMid: Date; actual: Date }
  const pastPairs: PastPair[] = []
  const blockRows: BlockInsert[] = []
  const currentProjections: BlockProjection[] = []

  // 19 plots share one planting date so Flow B has a collision to show.
  const collisionDate = utcDate('2026-05-18')
  const collisionPlots = new Set(plots!.slice(0, COLLIDING_PLOTS).map(p => p.id))

  for (const plot of plots!) {
    const village = villageByName.get(plotVillage.get(plot.id)!)!
    const cellKey = `${Number(plot.grid_lat)}|${Number(plot.grid_lng)}`
    const weather = weatherByCell.get(cellKey)
    if (!weather) throw new Error(`no weather loaded for cell ${cellKey}`)

    // detectCollisions buckets by commodity, so the collision group needs one
    // shared crop and variety as well as one shared planting date.
    const colliding = collisionPlots.has(plot.id)
    const slug = colliding ? 'padi' : rng.pick(village.crops)
    const commodityId = commodityBySlug.get(slug)
    if (!commodityId) throw new Error(`commodity "${slug}" is not seeded`)
    const choices = varietiesByCommodity.get(commodityId)
    if (!choices?.length) throw new Error(`no varieties seeded for "${slug}"`)
    const { id: varietyId, v: variety } = colliding ? choices[0] : rng.pick(choices)

    // Past seasons: predict as if standing at planting, then write an actual
    // that is INJECTED_BIAS_DAYS late. L2 has to find that number again.
    for (const year of [2024, 2025]) {
      const planted = addDays(utcDate(`${year}-04-01`), rng.int(-12, 12))
      const forecastAtPlanting = predictHarvest({
        plantingDate: planted, observed: [], forecast: [],
        climatology: weather.normals, variety,
      })
      const predictedMid = addDays(forecastAtPlanting.start,
        Math.round(daysBetween(forecastAtPlanting.start, forecastAtPlanting.end) / 2))
      const actual = addDays(predictedMid, INJECTED_BIAS_DAYS + rng.int(-2, 2))

      // Yield responds to the heat the crop actually got — the signal the
      // yield model has to recover. Without it, actual yield is noise and a
      // fitted model correctly learns nothing.
      const ratio = gddBetween(weather.observed, variety, planted, actual) / variety.gddRequirement
      const seasonTemp = meanTempBetween(weather.observed, planted, actual)
      const baseline = (variety.yieldPerHaMin + variety.yieldPerHaMax) / 2
      const index = 1
        + INJECTED_YIELD_HEAT_EFFECT * (ratio - 1)
        - INJECTED_TEMP_PENALTY * (seasonTemp - YIELD_OPTIMUM_C)
        + rng.normal(0, YIELD_NOISE_SD)
      const yieldPerHa = Math.max(0.3, index) * baseline

      blockRows.push({
        plot_id: plot.id, label: `MT-${year}`, area_ha: plot.area_ha,
        order_index: year - 2024, commodity_id: commodityId, variety_id: varietyId,
        planting_date: toISODate(planted),
        actual_harvest_date: toISODate(actual),
        actual_yield_kg: Number((yieldPerHa * 1000 * Number(plot.area_ha)).toFixed(2)),
        actual_price_per_kg: Number((priceForWeek(commodityId, actual) * rng.uniform(0.94, 1.06)).toFixed(2)),
        payment_received_date: toISODate(addDays(actual, rng.int(10, 30))),
      })
      pastPairs.push({ varietyId, predictedMid, actual })
    }

    // Current season, still in the ground.
    const planted = colliding
      ? addDays(collisionDate, rng.int(-1, 1))
      : addDays(utcDate('2026-05-18'), rng.int(-45, 40))
    blockRows.push({
      plot_id: plot.id, label: 'MT-2026', area_ha: plot.area_ha, order_index: 2,
      commodity_id: commodityId, variety_id: varietyId,
      planting_date: toISODate(planted),
    })

    const window = predictHarvest({
      plantingDate: planted,
      observed: weather.observed.filter(d => d.date <= toISODate(planted)),
      forecast: [], climatology: weather.normals, variety,
    })
    const baseline = (variety.yieldPerHaMin + variety.yieldPerHaMax) / 2
    currentProjections.push({
      blockId: plot.id, plotId: plot.id, commodityId,
      window: { start: window.start, end: window.end },
      expectedTonnes: baseline * Number(plot.area_ha),
    })
  }

  const { error: bErr } = await db.from('block').insert(blockRows)
  fail('insert blocks', bErr)

  // --- calibration ---------------------------------------------------------
  const byVariety = new Map<string, { predictedMid: Date; actual: Date }[]>()
  for (const p of pastPairs) {
    const list = byVariety.get(p.varietyId) ?? []
    list.push({ predictedMid: p.predictedMid, actual: p.actual })
    byVariety.set(p.varietyId, list)
  }
  const calibrationRows = [...byVariety.entries()].map(([varietyId, observations]) => {
    const c = fitCalibration(observations)
    return {
      cooperative_id: cooperativeId, variety_id: varietyId,
      offset_days: Number(c.offsetDays.toFixed(2)),
      n_observations: c.nObservations,
      residual_sd: Number(c.residualSd.toFixed(2)),
    }
  })
  fail('insert calibration', (await db.from('calibration').insert(calibrationRows)).error)

  // --- report --------------------------------------------------------------
  const offsets = calibrationRows.map(c => c.offset_days)
  const meanOffset = offsets.reduce((s, x) => s + x, 0) / offsets.length
  console.log(`\n${plots!.length} plots, ${blockRows.length} blocks, ${calibrationRows.length} calibrations`)
  console.log(`L2 closed loop: injected ${INJECTED_BIAS_DAYS}d, recovered ${meanOffset.toFixed(2)}d ` +
    `(per-variety ${offsets.map(o => o.toFixed(1)).join(', ')})`)
  if (Math.abs(meanOffset - INJECTED_BIAS_DAYS) > 1) {
    console.error('FAIL: L2 did not rediscover the injected bias. One of the two is wrong.')
    process.exitCode = 1
  }
  const { weeks, flagged } = detectCollisions(currentProjections, null)
  const peak = weeks.reduce((a, b) => (a.tonnes >= b.tonnes ? a : b), weeks[0])
  console.log(`Flow B: ${weeks.length} harvest weeks, peak ${peak?.tonnes.toFixed(1)}t in ` +
    `${peak?.isoWeek} across ${peak?.blockIds.length} plots, ${flagged.length} week(s) flagged`)

  console.log(`Cooperative id: ${cooperativeId}`)
  console.log(`Done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

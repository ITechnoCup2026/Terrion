// Everything the no-login plot page is allowed to know.
//
// The exclusion of coordinates is structural, not a matter of remembering: the
// returned types carry no lat, lng, grid_lat or grid_lng field, so the page
// cannot render one even by accident. Coordinates are read here -- weather is
// fetched per grid cell and there is no other way to predict a harvest -- but
// they never leave this function.
//
// This is also why the public page does not simply query `plot`. The
// `public_plot` view exists precisely so a public reader cannot name a column
// that was never meant for them, and it is the source of every display field
// below.

import { utcDate } from '@/lib/agronomy/dates'
import { predictHarvest } from '@/lib/agronomy/predict'
import type { HarvestWindow, Variety } from '@/lib/agronomy/types'
import type { PlotNeighbour } from '@/lib/plots/siblings'
import { createServiceClient } from '@/lib/supabase/server'
import { loadWeatherFor } from '@/lib/weather/sync'

export type PublicBlock = {
  id: string
  label: string
  areaHa: number
  orderIndex: number
  commodityName: string
  varietyName: string
  spriteRow: number
  plantingDate: Date
  window: HarvestWindow | null
  /** The variety's published range for this area, in tonnes. Deliberately a
   *  range: the dashboard's point estimate comes from a fitted model this page
   *  has no business running, and a single number here would claim a precision
   *  nobody computed. */
  yieldRangeTonnes: { min: number; max: number } | null
}

export type PublicPlot = {
  publicId: string
  name: string
  areaHa: number
  memberName: string
  village: string
  district: string
  blocks: PublicBlock[]
  /** No weather for this cell yet, so no window can be predicted. */
  degraded: boolean
  /** Which decorative landscape frames the diagram. Carries no geography --
   *  it picks edge motifs, and the canvas captions them as illustration. */
   terrainSeed: number
}

/** One plot as the public sees it, or null when the code matches nothing. */
export async function loadPublicPlot(publicId: string): Promise<PublicPlot | null> {
  const db = createServiceClient()

  // The view carries only the fields a stranger may see.
  const { data: view } = await db.from('public_plot')
    .select('public_id, name, area_ha, member_name, village, district, terrain_seed')
    .eq('public_id', publicId).maybeSingle()
  // Every column of a view is nullable as far as the generated types are
  // concerned, so the identity this page is built around is checked rather
  // than assumed.
  if (!view?.public_id) return null

  // The plot row is read for its id and grid cell alone. Neither is returned.
  const { data: plot } = await db.from('plot')
    .select('id, grid_lat, grid_lng')
    .eq('public_id', publicId).maybeSingle()
  if (!plot) return null

  // Only what is still in the ground. A block is a season, not a spatial
  // subdivision -- MT-2024, MT-2025 and MT-2026 each cover the whole plot -- so
  // including harvested ones would allocate several times the plot's area in
  // the diagram and advertise a harvest that happened two years ago.
  const { data: blockRows } = await db.from('block')
    .select('id, label, area_ha, order_index, commodity_id, variety_id, planting_date')
    .eq('plot_id', plot.id).is('actual_harvest_date', null).order('order_index')

  const blocks = blockRows ?? []
  const [{ data: commodities }, { data: varieties }] = await Promise.all([
    db.from('commodity').select('id, name, sprite_row')
      .in('id', [...new Set(blocks.map(b => b.commodity_id))]),
    db.from('variety').select('*')
      .in('id', [...new Set(blocks.map(b => b.variety_id))]),
  ])
  const commodityById = new Map((commodities ?? []).map(c => [c.id, c]))
  const varietyRowById = new Map((varieties ?? []).map(v => [v.id, v]))

  const { observed, normals } = await loadWeatherFor(
    Number(plot.grid_lat), Number(plot.grid_lng), undefined, new Date(), db)
  const degraded = normals.length === 0

  const today = new Date().toISOString().slice(0, 10)

  return {
    publicId: view.public_id,
    terrainSeed: view.terrain_seed ?? 0,
    name: view.name ?? 'Lahan',
    areaHa: Number(view.area_ha ?? 0),
    memberName: view.member_name ?? '',
    village: view.village ?? '',
    district: view.district ?? '',
    degraded,
    blocks: blocks.map(b => {
      const row = varietyRowById.get(b.variety_id)
      const commodity = commodityById.get(b.commodity_id)
      const areaHa = Number(b.area_ha)

      const variety: Variety | null = row ? {
        gddRequirement: Number(row.gdd_requirement),
        baseTempC: Number(row.base_temp_c),
        daysToHarvestMin: row.days_to_harvest_min,
        daysToHarvestMax: row.days_to_harvest_max,
        yieldPerHaMin: Number(row.yield_per_ha_min),
        yieldPerHaMax: Number(row.yield_per_ha_max),
      } : null

      return {
        id: b.id,
        label: b.label,
        areaHa,
        orderIndex: b.order_index,
        commodityName: commodity?.name ?? 'Komoditas',
        varietyName: row?.name ?? '',
        spriteRow: commodity?.sprite_row ?? 0,
        plantingDate: utcDate(b.planting_date),
        window: variety && !degraded
          ? predictHarvest({
              plantingDate: utcDate(b.planting_date),
              observed: observed.filter(d => d.date <= today),
              forecast: observed.filter(d => d.date > today),
              climatology: normals,
              variety,
            })
          : null,
        yieldRangeTonnes: variety
          ? { min: variety.yieldPerHaMin * areaHa, max: variety.yieldPerHaMax * areaHa }
          : null,
      }
    }),
  }
}


export type CooperativePlots = {
  /** Null when no cooperative matches the village and district pair. The page
   *  falls back to naming the village, which the plot already carries. */
  cooperativeName: string | null
  plots: PlotNeighbour[]
}

/**
 * Every plot the same cooperative has made public, for the sibling navigation.
 *
 * Reads `public_plot` like everything else on this page, so it inherits the
 * same guarantee: the view has no coordinate column, so a list of a
 * cooperative's fields cannot become a list of their locations.
 *
 * Scoped by village and district rather than by cooperative id, because that
 * is the only handle the view exposes -- the same pairing `loadAtlasFarm`
 * uses. Two cooperatives in one village would therefore be listed together;
 * that is a real limitation of the view, not an oversight, and it errs towards
 * showing a neighbour's public page rather than hiding one.
 *
 * Ordered by name, so "previous" and "next" mean the same thing on every plot
 * of the cooperative and do not shuffle between requests.
 */
export async function loadCooperativePlots(
  village: string, district: string,
): Promise<CooperativePlots> {
  const db = createServiceClient()

  const [{ data: coops }, { data: rows }] = await Promise.all([
    db.from('cooperative').select('name')
      .eq('village', village).eq('district', district).limit(1),
    db.from('public_plot').select('public_id, name, member_name, area_ha')
      .eq('village', village).eq('district', district).order('name'),
  ])

  const plots: PlotNeighbour[] = []
  for (const r of rows ?? []) {
    // Every column of a view is nullable to the generated types, and a plot
    // with no public id has no page to link to.
    if (!r.public_id) continue
    plots.push({
      publicId: r.public_id,
      name: r.name ?? 'Lahan',
      memberName: r.member_name ?? '',
      areaHa: Number(r.area_ha ?? 0),
    })
  }

  return { cooperativeName: coops?.[0]?.name ?? null, plots }
}

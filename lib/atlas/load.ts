// What the Atlas is allowed to show a stranger.
//
// The whole surface is public — no login, no session — so the shape returned
// here is the security boundary. It carries cooperative-level location only:
// the village and the cooperative's own coordinates, which are the address of
// an organisation rather than of anybody's field.
//
// Plot coordinates never appear. The farm view reads `public_plot`, the same
// view the shared-garden page uses, which has no lat, lng or nik_hash column to
// leak — an exclusion that is structural rather than a filter somebody has to
// remember to apply.

import { createServiceClient } from '@/lib/supabase/server'

/** One cooperative, as a pin on the map. */
export type AtlasCooperative = {
  id: string
  name: string
  village: string
  district: string
  province: string
  lat: number
  lng: number
  plotCount: number
  hectares: number
}

/** One plot inside the farm view. No coordinates, by construction. */
export type AtlasPlot = {
  publicId: string
  name: string
  memberName: string
  areaHa: number
  /** Crop names currently in the ground, for the little field tiles. */
  crops: string[]
}

export type AtlasFarm = {
  cooperativeId: string
  name: string
  village: string
  district: string
  province: string
  plots: AtlasPlot[]
  totalHectares: number
}

/**
 * Every cooperative with its size, for the country and province views.
 *
 * The service client is used because this is deliberately cross-tenant: the
 * Atlas shows every cooperative to everybody, which is its entire purpose. The
 * columns are enumerated rather than selected with `*` so a column added to
 * `cooperative` later cannot silently become public.
 */
export async function loadAtlasCooperatives(): Promise<AtlasCooperative[]> {
  const db = createServiceClient()

  const { data: coops, error } = await db
    .from('cooperative')
    .select('id, name, village, district, province, lat, lng')
    .order('name')
  if (error) throw new Error(`atlas cooperative read failed: ${error.message}`)
  if (!coops?.length) return []

  const { data: plots } = await db.from('plot').select('cooperative_id, area_ha')

  const tally = new Map<string, { count: number; hectares: number }>()
  for (const p of plots ?? []) {
    const row = tally.get(p.cooperative_id) ?? { count: 0, hectares: 0 }
    row.count += 1
    row.hectares += Number(p.area_ha)
    tally.set(p.cooperative_id, row)
  }

  return coops.map(c => ({
    id: c.id,
    name: c.name,
    village: c.village,
    district: c.district,
    province: c.province,
    lat: Number(c.lat),
    lng: Number(c.lng),
    plotCount: tally.get(c.id)?.count ?? 0,
    hectares: tally.get(c.id)?.hectares ?? 0,
  }))
}

/**
 * One cooperative's farm, for the full-screen visit.
 *
 * Reads `public_plot` rather than `plot`. That view exposes no coordinate
 * column at all, so this function cannot leak a field's location even by
 * mistake — the same guarantee C9's shared garden page relies on.
 */
export async function loadAtlasFarm(cooperativeId: string): Promise<AtlasFarm | null> {
  const db = createServiceClient()

  const { data: coop } = await db
    .from('cooperative')
    .select('id, name, village, district, province')
    .eq('id', cooperativeId)
    .maybeSingle()
  if (!coop) return null

  // public_plot carries no cooperative id, so the cooperative's own village
  // and district are what scope it — the same pair the view exposes.
  const { data: rows } = await db
    .from('public_plot')
    .select('public_id, name, area_ha, member_name, village, district')
    .eq('village', coop.village)
    .eq('district', coop.district)
    .order('name')

  const plots: AtlasPlot[] = []
  for (const r of rows ?? []) {
    if (!r.public_id) continue
    plots.push({
      publicId: r.public_id,
      name: r.name ?? 'Lahan',
      memberName: r.member_name ?? 'Anggota',
      areaHa: Number(r.area_ha ?? 0),
      crops: [],
    })
  }

  // What is actually growing, for the field tiles. Only unharvested blocks: a
  // block is a season, so past ones would advertise crops that are long gone.
  if (plots.length > 0) {
    const { data: blocks } = await db
      .from('plot')
      .select('public_id, block(commodity_id, actual_harvest_date)')
      .in('public_id', plots.map(p => p.publicId))

    const { data: commodities } = await db.from('commodity').select('id, name')
    const nameOf = new Map((commodities ?? []).map(c => [c.id, c.name]))
    const cropsByPlot = new Map<string, string[]>()

    for (const row of blocks ?? []) {
      const list = (Array.isArray(row.block) ? row.block : [row.block]).filter(Boolean)
      const names = [...new Set(
        list
          .filter(b => b && b.actual_harvest_date === null)
          .map(b => nameOf.get(b!.commodity_id))
          .filter((n): n is string => !!n),
      )]
      if (row.public_id) cropsByPlot.set(row.public_id, names)
    }
    for (const plot of plots) plot.crops = cropsByPlot.get(plot.publicId) ?? []
  }

  return {
    cooperativeId: coop.id,
    name: coop.name,
    village: coop.village,
    district: coop.district,
    province: coop.province,
    plots,
    totalHectares: plots.reduce((s, p) => s + p.areaHa, 0),
  }
}

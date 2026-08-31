import { apiFetch } from '@/lib/api/client'
import type { AtlasCooperativeRaw, AtlasFarmResponseRaw } from '@/lib/api/types'

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

function toAtlasCooperative(raw: AtlasCooperativeRaw): AtlasCooperative {
  return {
    id: raw.id,
    name: raw.name,
    village: raw.village,
    district: raw.district,
    province: raw.province,
    lat: raw.lat,
    lng: raw.lng,
    plotCount: raw.plot_count,
    hectares: raw.hectares,
  }
}

export async function loadAtlasCooperatives(): Promise<AtlasCooperative[]> {
  const raw = await apiFetch<AtlasCooperativeRaw[]>('/api/atlas/cooperatives')
  return raw.map(toAtlasCooperative)
}

export async function loadAtlasFarm(cooperativeId: string): Promise<AtlasFarm | null> {
  try {
    const raw = await apiFetch<AtlasFarmResponseRaw>(`/api/atlas/farms/${cooperativeId}`)
    return {
      cooperativeId: raw.cooperative_id,
      name: raw.name,
      village: raw.village,
      district: raw.district,
      province: raw.province,
      totalHectares: raw.total_hectares,
      plots: raw.plots.map(plot => ({
        publicId: plot.public_id,
        name: plot.name,
        memberName: plot.member_name,
        areaHa: plot.area_ha,
        crops: plot.crops,
      })),
    }
  } catch {
    return null
  }
}

import { apiFetch, isBackendDown, isNotFound } from '@/lib/api/client'
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

/** null for a cooperative that is not there; anything else is rethrown. */
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
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

/**
 * The same pins, for a page that would rather render without them than not
 * render at all.
 *
 * The landing page is the one surface where the backend being unreachable
 * should not produce an error screen: its counts sit at the foot of the fold,
 * under a headline and two links that need no data whatsoever, and a stranger
 * who cannot even read what Terrion is will not come back to find out.
 *
 * null is "could not ask", which is not the same claim as `[]` -- that one
 * means nobody has registered, and the page says so in words.
 */
export async function loadAtlasCooperativesIfUp(): Promise<AtlasCooperative[] | null> {
  try {
    return await loadAtlasCooperatives()
  } catch (error) {
    if (isBackendDown(error)) {
      console.error('[atlas] cooperatives unavailable', error)
      return null
    }
    throw error
  }
}

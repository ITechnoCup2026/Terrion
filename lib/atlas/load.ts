/**
 * This repo has no backend attached -- the Supabase project this used to read
 * cooperatives and farms from was removed. The Atlas is public (no session,
 * no gate), so it renders straight through with an empty map instead of
 * redirecting anywhere. Re-wire these two functions to a real data source
 * when the backend comes back; the types below are the contract the rest of
 * the Atlas is built against.
 */

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

export async function loadAtlasCooperatives(): Promise<AtlasCooperative[]> {
  return []
}

export async function loadAtlasFarm(_cooperativeId: string): Promise<AtlasFarm | null> {
  return null
}

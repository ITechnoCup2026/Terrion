/**
 * This repo has no backend attached -- the Supabase project this used to
 * store weather in was removed. The only remaining caller (the plot page)
 * sits behind a currentAppUser() guard that always redirects before this
 * would run. Kept as a stub, rather than deleted, so that page still
 * type-checks.
 */

import type { ClimateNormals, TempDay } from '@/lib/agronomy/types'

export async function loadWeatherFor(
  _gridLat: number, _gridLng: number, _since?: Date, _now = new Date(), _client?: unknown,
): Promise<{ observed: TempDay[]; normals: ClimateNormals }> {
  return { observed: [], normals: [] }
}

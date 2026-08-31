/**
 * This repo has no backend attached -- the Supabase project this used to
 * derive listings from was removed. The catalogue is public (no session, no
 * gate), so it renders straight through with an empty result set instead of
 * redirecting anywhere. Re-wire these to a real data source when the backend
 * comes back.
 */

import type { Listing } from './listings'

export type Catalog = {
  listings: Listing[]
  commodities: { id: string; name: string }[]
  provinces: string[]
}

const EMPTY: Catalog = { listings: [], commodities: [], provinces: [] }

export async function computeCatalogListings(_now = new Date()): Promise<Catalog> {
  return EMPTY
}

export async function loadCatalogListings(_now = new Date()): Promise<Catalog> {
  return EMPTY
}

export async function loadCooperativeListings(
  _cooperativeId: string, _now = new Date(),
): Promise<Listing[]> {
  return []
}

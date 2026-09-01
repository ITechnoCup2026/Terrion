import { apiFetch } from '@/lib/api/client'
import type { CatalogResponseRaw, ListingRaw } from '@/lib/api/types'
import type { Listing, ListingFilters } from './listings'

export type Catalog = {
  listings: Listing[]
  commodities: { id: string; name: string }[]
  provinces: string[]
}

function toListing(raw: ListingRaw): Listing {
  return {
    id: raw.id,
    cooperativeId: raw.cooperative_id,
    cooperativeName: raw.cooperative_name,
    province: raw.province,
    district: raw.district,
    village: raw.village,
    commodityId: raw.commodity_id,
    commodityName: raw.commodity_name,
    varietyName: raw.variety_name,
    isoWeek: raw.iso_week,
    weekStart: new Date(raw.week_start),
    weekEnd: new Date(raw.week_end),
    tonnes: raw.tonnes,
    blockIds: [],
    basis: raw.basis,
  }
}

/**
 * GET /api/catalog does its own filtering and caches the result for an hour,
 * so the filters a buyer picks are sent as query params rather than applied
 * locally against an unfiltered list.
 */
export async function loadCatalogListings(filters: ListingFilters = {}): Promise<Catalog> {
  const raw = await apiFetch<CatalogResponseRaw>('/api/catalog', {
    query: {
      commodity_id: filters.commodityId,
      province: filters.province,
      weeks_ahead: filters.weeksAhead,
      min_tonnes: filters.minTonnes,
    },
  })
  return {
    listings: raw.listings.map(toListing),
    commodities: raw.commodities,
    provinces: raw.provinces,
  }
}

export async function loadCooperativeListings(cooperativeId: string): Promise<Listing[]> {
  const raw = await apiFetch<ListingRaw[]>(`/api/catalog/cooperatives/${cooperativeId}`)
  return raw.map(toListing)
}

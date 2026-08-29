// The database half of the catalogue: read cooperatives, project each one, and
// hand lib/catalog/listings.ts everything it needs to build listings.
//
// Untested by convention -- the logic lives in listings.ts, which is pure. This
// file only fetches and reshapes.
//
// It uses the service client deliberately. The catalogue is public and exposes
// only cooperative name, region, commodity, tonnage and week. It must never
// widen to plot.lat / plot.lng, which are the reason the public plot page uses
// a security-definer view instead of an RLS policy on plot.

import { unstable_cache } from 'next/cache'

import { utcDate } from '@/lib/agronomy/dates'
import { projectCooperative } from '@/lib/agronomy/project'
import { createServiceClient } from '@/lib/supabase/server'

import { buildListings, type Listing, type ListingSource } from './listings'

/** How long a projection may be reused. It is the same answer minute to minute. */
const CACHE_SECONDS = 3600

// The cache serialises what it stores, and a Listing carries Date objects.
// Rather than rely on how the data cache happens to round-trip a Date, the
// cached shape is explicitly JSON-safe and revived on the way out.
type StoredListing = Omit<Listing, 'weekStart' | 'weekEnd'> & {
  weekStart: string
  weekEnd: string
}

// Dates out.
function store(listing: Listing): StoredListing {
  return {
    ...listing,
    weekStart: listing.weekStart.toISOString().slice(0, 10),
    weekEnd: listing.weekEnd.toISOString().slice(0, 10),
  }
}

// Dates back in.
function revive(stored: StoredListing): Listing {
  return {
    ...stored,
    weekStart: utcDate(stored.weekStart),
    weekEnd: utcDate(stored.weekEnd),
  }
}

type Coop = {
  id: string; name: string; province: string; district: string; village: string
}

// Everything a set of cooperatives needs to become listings.
async function sourcesFor(coops: Coop[], now: Date): Promise<ListingSource[]> {
  const db = createServiceClient()

  const { data: commodityRows } = await db.from('commodity').select('id, name')
  const commodityNames = new Map((commodityRows ?? []).map(c => [c.id, c.name]))

  const sources: ListingSource[] = []
  for (const coop of coops) {
    const { projections, windows } = await projectCooperative(coop.id, now)
    if (projections.length === 0) continue

    // Variety names, and which blocks rest on climatology rather than observed
    // weather. Both are per block, so they are keyed by block id.
    const blockIds = projections.map(p => p.blockId)
    const { data: blocks } = await db.from('block')
      .select('id, variety:variety_id(name)')
      .in('id', blockIds)

    const varietyByBlock = new Map<string, string>()
    for (const b of blocks ?? []) {
      const name = (b.variety as unknown as { name: string } | null)?.name
      if (name) varietyByBlock.set(b.id, name)
    }

    const climatologyBlocks = new Set<string>()
    for (const [blockId, window] of windows) {
      if (window.basis === 'climatology') climatologyBlocks.add(blockId)
    }

    sources.push({
      cooperativeId: coop.id,
      cooperativeName: coop.name,
      province: coop.province,
      district: coop.district,
      village: coop.village,
      projections,
      varietyByBlock,
      climatologyBlocks,
      commodityNames,
    })
  }
  return sources
}

// Every cooperative's listings, computed fresh. Expensive: one full projection
// per cooperative, each re-simulating GDD for every block.
async function computeCatalog(dayKey: string): Promise<{
  listings: StoredListing[]
  commodities: { id: string; name: string }[]
  provinces: string[]
}> {
  const now = utcDate(dayKey)
  const db = createServiceClient()
  const { data: coops } = await db.from('cooperative')
    .select('id, name, province, district, village')

  const listings = buildListings(await sourcesFor(coops ?? [], now), now)

  // Filter options come from what is actually listed, so a buyer can never pick
  // a commodity or region that returns nothing.
  const commodities = [...new Map(
    listings.map(l => [l.commodityId, { id: l.commodityId, name: l.commodityName }]),
  ).values()].sort((a, b) => a.name.localeCompare(b.name))

  const provinces = [...new Set(listings.map(l => l.province))].sort()

  return { listings: listings.map(store), commodities, provinces }
}

const cachedCatalog = unstable_cache(computeCatalog, ['catalog-listings'], {
  revalidate: CACHE_SECONDS,
})

export type Catalog = {
  listings: Listing[]
  commodities: { id: string; name: string }[]
  provinces: string[]
}

/**
 * Uncached, for scripts.
 *
 * unstable_cache needs Next's incremental cache, which exists only inside a
 * server request. scripts/verify-commerce.ts runs outside one, and a cached
 * catalogue nobody can verify from the command line would be worse than an
 * uncached one.
 */
export async function computeCatalogListings(now = new Date()): Promise<Catalog> {
  const { listings, commodities, provinces } =
    await computeCatalog(now.toISOString().slice(0, 10))
  return { listings: listings.map(revive), commodities, provinces }
}

/**
 * Every cooperative's listings, plus the values the filter controls offer.
 *
 * Cached at this level rather than on the page. The catalogue page reads
 * searchParams for its filters, which is a dynamic API and makes the page
 * uncacheable no matter what a route segment export says -- so caching the
 * expensive computation is the only thing that actually works. The day is part
 * of the cache key so the horizon rolls forward.
 */
export async function loadCatalogListings(now = new Date()): Promise<Catalog> {
  const { listings, commodities, provinces } =
    await cachedCatalog(now.toISOString().slice(0, 10))
  return { listings: listings.map(revive), commodities, provinces }
}

/** One cooperative's listings -- all the detail page needs, at a fraction of the cost. */
export async function loadCooperativeListings(
  cooperativeId: string, now = new Date(),
): Promise<Listing[]> {
  const db = createServiceClient()
  const { data: coop } = await db.from('cooperative')
    .select('id, name, province, district, village')
    .eq('id', cooperativeId).maybeSingle()
  if (!coop) return []

  return buildListings(await sourcesFor([coop], now), now)
}

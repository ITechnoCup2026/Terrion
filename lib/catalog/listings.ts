// What a buyer browses: one cooperative's projected tonnage of one commodity in
// one ISO week.
//
// There is no listing table, and deliberately so. The catalogue is derived from
// the same projection the dashboard draws, through the same week bucketer, so
// the two screens cannot disagree about the same harvest. A stored listing
// would be a second copy of a number that changes whenever the weather does.

import { bucketByWeek } from '@/lib/agronomy/collide'
import { addDays, isoWeekKey, isoWeekStart } from '@/lib/agronomy/dates'
import type { BlockProjection } from '@/lib/agronomy/types'
import { DEFAULT_HORIZON_WEEKS } from '@/lib/dashboard/series'

/** The catalogue reaches exactly as far as the dashboard chart, never further
 *  than the projection itself can see. */
export const CATALOG_HORIZON_WEEKS = DEFAULT_HORIZON_WEEKS

export type ListingSource = {
  cooperativeId: string
  cooperativeName: string
  province: string
  district: string
  village: string
  projections: BlockProjection[]
  /** blockId -> variety name. */
  varietyByBlock: Map<string, string>
  /** Blocks whose window rests on climatology rather than observed weather. */
  climatologyBlocks: Set<string>
  /** commodityId -> display name. */
  commodityNames: Map<string, string>
}

export type Listing = {
  id: string
  cooperativeId: string
  cooperativeName: string
  province: string
  district: string
  village: string
  commodityId: string
  commodityName: string
  /** Only set when every block in the week shares one variety. */
  varietyName: string | null
  isoWeek: string
  weekStart: Date
  weekEnd: Date
  tonnes: number
  blockIds: string[]
  /** Climatology if any contributing block's window is a guess. */
  basis: 'observed' | 'climatology'
}

export type ParsedListingId = {
  cooperativeId: string
  commodityId: string
  isoWeek: string
}

export type ListingFilters = {
  commodityId?: string
  province?: string
  weeksAhead?: number
  minTonnes?: number
}

// A double hyphen, because a UUID contains single hyphens but never two in a row.
const SEPARATOR = '--'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_WEEK = /^\d{4}-W\d{2}$/

/** The URL identity of a listing, derived so no row has to exist. */
export function listingId(
  cooperativeId: string, commodityId: string, isoWeek: string,
): string {
  return [cooperativeId, commodityId, isoWeek].join(SEPARATOR)
}

/** The inverse, returning null for anything malformed so callers can 404. */
export function parseListingId(raw: string): ParsedListingId | null {
  const parts = raw.split(SEPARATOR)
  if (parts.length !== 3) return null

  const [cooperativeId, commodityId, isoWeek] = parts
  if (!UUID.test(cooperativeId)) return null
  if (!UUID.test(commodityId)) return null
  if (!ISO_WEEK.test(isoWeek)) return null

  return { cooperativeId, commodityId, isoWeek }
}

/** Every listing each source offers inside the horizon, soonest and heaviest first. */
export function buildListings(
  sources: ListingSource[], from: Date, weeks = CATALOG_HORIZON_WEEKS,
): Listing[] {
  const first = isoWeekStart(from)
  const horizon = new Set(
    Array.from({ length: weeks }, (_, i) => isoWeekKey(addDays(first, i * 7))),
  )

  const listings: Listing[] = []
  for (const source of sources) {
    for (const bucket of bucketByWeek(source.projections).values()) {
      if (!horizon.has(bucket.isoWeek)) continue

      const varieties = new Set(
        bucket.blockIds.map(id => source.varietyByBlock.get(id)).filter(Boolean),
      )

      listings.push({
        id: listingId(source.cooperativeId, bucket.commodityId, bucket.isoWeek),
        cooperativeId: source.cooperativeId,
        cooperativeName: source.cooperativeName,
        province: source.province,
        district: source.district,
        village: source.village,
        commodityId: bucket.commodityId,
        commodityName: source.commodityNames.get(bucket.commodityId) ?? 'Komoditas',
        varietyName: varieties.size === 1 ? [...varieties][0]! : null,
        isoWeek: bucket.isoWeek,
        weekStart: bucket.weekStart,
        weekEnd: addDays(bucket.weekStart, 6),
        tonnes: bucket.tonnes,
        blockIds: bucket.blockIds,
        basis: bucket.blockIds.some(id => source.climatologyBlocks.has(id))
          ? 'climatology'
          : 'observed',
      })
    }
  }

  // Soonest first — a buyer's question is "what can I get, and when".
  return listings.sort((a, b) =>
    a.weekStart.getTime() - b.weekStart.getTime() || b.tonnes - a.tonnes)
}

/** Narrow the catalogue. Every filter is optional and they combine. */
export function filterListings(
  listings: Listing[], filters: ListingFilters, from: Date,
): Listing[] {
  const cutoff = filters.weeksAhead == null
    ? null
    : addDays(isoWeekStart(from), filters.weeksAhead * 7 - 1)

  return listings.filter(l => {
    if (filters.commodityId && l.commodityId !== filters.commodityId) return false
    if (filters.province && l.province !== filters.province) return false
    if (filters.minTonnes != null && l.tonnes < filters.minTonnes) return false
    if (cutoff && l.weekStart > cutoff) return false
    return true
  })
}

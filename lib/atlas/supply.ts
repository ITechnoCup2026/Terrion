// What each region on the Atlas actually has, and how deeply to shade it.
//
// The Atlas used to know one bit per region: is there a cooperative here, yes
// or no. That is the least interesting thing the product knows about a place.
// The public catalogue already carries projected tonnage per cooperative per
// week, derived from the same projection the dashboard draws, so the map can
// answer the question the rest of Terrion answers -- how much is coming, and
// when -- without inventing a number or adding an endpoint.
//
// Name matching, not codes. The cooperative table stores region NAMES and the
// boundary files store BPS codes, so a join has to go through the names, and
// the two spellings disagree in one predictable way: the app says "Kabupaten
// Subang" and the boundary data says "Subang". `regionKey` is the single place
// that disagreement is resolved, which is why both maps below go through it.

import type { AtlasCooperative } from '@/lib/atlas/load'
import type { Listing } from '@/lib/catalog/listings'

/** What the map draws for one province or one regency. */
export type RegionSupply = {
  cooperatives: number
  plots: number
  hectares: number
  /** Projected over the catalogue's twelve-week horizon. */
  tonnes: number
  /** The listings behind `tonnes`, for the panel's ruler. */
  listings: Listing[]
}

/**
 * The join key for a region name.
 *
 * Strips the administrative prefix the app stores and the boundary data does
 * not, then case-folds. Everything that matches a cooperative to a shape goes
 * through here; a second normalisation somewhere else is how the map ends up
 * silently missing a province.
 */
export function regionKey(name: string): string {
  return name.replace(/^(kabupaten|kota|provinsi)\s+/i, '').trim().toLowerCase()
}

function empty(): RegionSupply {
  return { cooperatives: 0, plots: 0, hectares: 0, tonnes: 0, listings: [] }
}

function accumulate(
  map: Map<string, RegionSupply>,
  key: string,
  add: (into: RegionSupply) => void,
): void {
  const entry = map.get(key) ?? empty()
  add(entry)
  map.set(key, entry)
}

/**
 * Region name -> everything the map and panel show for it.
 *
 * `pick` says which field of a cooperative and of a listing names the region,
 * so the province and regency maps are the same function twice rather than two
 * copies that can drift.
 */
function supplyBy(
  cooperatives: readonly AtlasCooperative[],
  listings: readonly Listing[],
  pick: (of: { province: string; district: string }) => string,
): Map<string, RegionSupply> {
  const map = new Map<string, RegionSupply>()

  for (const c of cooperatives) {
    accumulate(map, regionKey(pick(c)), into => {
      into.cooperatives += 1
      into.plots += c.plotCount
      into.hectares += c.hectares
    })
  }

  for (const l of listings) {
    const key = regionKey(pick(l))
    // A listing whose region has no registered cooperative would create a
    // region the map cannot draw a boundary for. That should not happen, but
    // if the two datasets ever disagree the map must not invent a shape.
    if (!map.has(key)) continue
    accumulate(map, key, into => {
      into.tonnes += l.tonnes
      into.listings.push(l)
    })
  }

  return map
}

export function supplyByProvince(
  cooperatives: readonly AtlasCooperative[],
  listings: readonly Listing[],
): Map<string, RegionSupply> {
  return supplyBy(cooperatives, listings, r => r.province)
}

export function supplyByRegency(
  cooperatives: readonly AtlasCooperative[],
  listings: readonly Listing[],
): Map<string, RegionSupply> {
  return supplyBy(cooperatives, listings, r => r.district)
}

/** The heaviest region on the map, which the shading scale is relative to. */
export function peakTonnes(regions: Iterable<RegionSupply>): number {
  let peak = 0
  for (const region of regions) if (region.tonnes > peak) peak = region.tonnes
  return peak
}

/**
 * How deeply to shade a region: 0 to 4.
 *
 *   0  a cooperative is registered here and has nothing projected
 *   1-4 quartiles of the heaviest region on the map
 *
 * Step 0 is a state, not an absence, and it is the one the rest of the product
 * is most careful about: a cooperative that has recorded no planting has not
 * projected zero tonnes, it has projected nothing. Collapsing it into the
 * lightest shade of "some supply" would be the map telling the same lie the
 * dashboard refuses to tell with its figures.
 *
 * Relative to the peak rather than to fixed thresholds, because there is no
 * tonnage that is objectively "a lot" -- one province of chilli and one of
 * rice are different orders of magnitude, and a fixed scale would render an
 * early Terrion with three cooperatives as a uniformly blank country.
 */
export function supplyStep(tonnes: number, peak: number): 0 | 1 | 2 | 3 | 4 {
  if (tonnes <= 0) return 0
  if (peak <= 0) return 1
  const quartile = Math.ceil((tonnes / peak) * 4)
  return Math.min(4, Math.max(1, quartile)) as 1 | 2 | 3 | 4
}

/** One week the Atlas can be scrubbed to. */
export type SupplyWeek = {
  isoWeek: string
  weekStart: Date
}

/**
 * Every week the catalogue covers, earliest first.
 *
 * Taken from the listings themselves rather than generated from a start date
 * and a horizon: the map may only be scrubbed to a week some cooperative
 * actually has a projection for, so the track cannot run off the end of what
 * the product can see.
 */
export function supplyWeeks(listings: readonly Listing[]): SupplyWeek[] {
  const byWeek = new Map<string, Date>()
  for (const listing of listings) {
    if (!byWeek.has(listing.isoWeek)) byWeek.set(listing.isoWeek, listing.weekStart)
  }

  return [...byWeek.entries()]
    .map(([isoWeek, weekStart]) => ({ isoWeek, weekStart }))
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
}

/**
 * The listings for one week, or all of them.
 *
 * Null means the whole horizon, which is what the map opens on: the first
 * question is "where is there supply at all", and only then "when". Scrubbing
 * re-shades the same regions from a narrower slice, so a province that is dark
 * across twelve weeks can be seen to be dark in exactly two of them.
 */
export function listingsInWeek(
  listings: readonly Listing[], isoWeek: string | null,
): Listing[] {
  if (isoWeek === null) return [...listings]
  return listings.filter(listing => listing.isoWeek === isoWeek)
}

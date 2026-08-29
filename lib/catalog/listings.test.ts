import { describe, expect, it } from 'vitest'

import { utcDate } from '@/lib/agronomy/dates'
import type { BlockProjection } from '@/lib/agronomy/types'
import {
  buildListings, filterListings, listingId, parseListingId, type ListingSource,
} from './listings'

const COOP = '11111111-1111-1111-1111-111111111111'
const PADI = '22222222-2222-2222-2222-222222222222'
const JAGUNG = '33333333-3333-3333-3333-333333333333'

// One block whose whole window sits inside a single ISO week.
const projection = (
  blockId: string, commodityId: string, start: string, end: string, tonnes: number,
): BlockProjection => ({
  blockId, plotId: `plot-${blockId}`, commodityId,
  window: { start: utcDate(start), end: utcDate(end) },
  expectedTonnes: tonnes,
})

const source = (over: Partial<ListingSource> = {}): ListingSource => ({
  cooperativeId: COOP,
  cooperativeName: 'Koperasi Tani Subang Jaya',
  province: 'Jawa Barat',
  district: 'Kabupaten Subang',
  village: 'Pamanukan',
  projections: [],
  varietyByBlock: new Map(),
  climatologyBlocks: new Set(),
  commodityNames: new Map([[PADI, 'Padi'], [JAGUNG, 'Jagung']]),
  ...over,
})

const FROM = utcDate('2026-09-07')   // a Monday

describe('listingId / parseListingId', () => {
  it('round-trips', () => {
    expect(parseListingId(listingId(COOP, PADI, '2026-W37')))
      .toEqual({ cooperativeId: COOP, commodityId: PADI, isoWeek: '2026-W37' })
  })

  // A stale or hand-edited URL must 404, never throw or resolve to something else.
  it('returns null for malformed ids', () => {
    expect(parseListingId('')).toBeNull()
    expect(parseListingId('not-an-id')).toBeNull()
    expect(parseListingId(`${COOP}--${PADI}`)).toBeNull()
    expect(parseListingId(`${COOP}--${PADI}--2026-W99x`)).toBeNull()
    expect(parseListingId(`nope--${PADI}--2026-W37`)).toBeNull()
  })
})

describe('buildListings', () => {
  it('makes one listing per commodity per week', () => {
    const listings = buildListings([source({
      projections: [
        projection('b1', PADI, '2026-09-07', '2026-09-13', 20),
        projection('b2', PADI, '2026-09-07', '2026-09-13', 16.7),
        projection('b3', JAGUNG, '2026-09-14', '2026-09-20', 8),
      ],
    })], FROM)

    expect(listings).toHaveLength(2)
    expect(listings[0].commodityName).toBe('Padi')
    expect(listings[0].tonnes).toBeCloseTo(36.7, 5)
    expect(listings[0].blockIds).toEqual(['b1', 'b2'])
    expect(listings[1].commodityName).toBe('Jagung')
  })

  it('sorts soonest first, then heaviest', () => {
    const listings = buildListings([source({
      projections: [
        projection('late', PADI, '2026-09-14', '2026-09-20', 50),
        projection('small', JAGUNG, '2026-09-07', '2026-09-13', 5),
        projection('big', PADI, '2026-09-07', '2026-09-13', 30),
      ],
    })], FROM)

    expect(listings.map(l => l.blockIds[0])).toEqual(['big', 'small', 'late'])
  })

  // Naming one variety when the week mixes two would attribute all the tonnage
  // to whichever happened to sort first.
  it('names the variety only when the week has exactly one', () => {
    const listings = buildListings([source({
      projections: [
        projection('b1', PADI, '2026-09-07', '2026-09-13', 10),
        projection('b2', PADI, '2026-09-07', '2026-09-13', 10),
        projection('b3', JAGUNG, '2026-09-07', '2026-09-13', 10),
      ],
      varietyByBlock: new Map([['b1', 'Ciherang'], ['b2', 'IR64'], ['b3', 'Bisi-18']]),
    })], FROM)

    expect(listings.find(l => l.commodityId === PADI)!.varietyName).toBeNull()
    expect(listings.find(l => l.commodityId === JAGUNG)!.varietyName).toBe('Bisi-18')
  })

  // A week resting on climatology is a guess, and the card has to say so.
  it('marks a week as climatology when any contributing block is', () => {
    const listings = buildListings([source({
      projections: [
        projection('firm', PADI, '2026-09-07', '2026-09-13', 10),
        projection('guess', PADI, '2026-09-07', '2026-09-13', 10),
      ],
      climatologyBlocks: new Set(['guess']),
    })], FROM)

    expect(listings[0].basis).toBe('climatology')
  })

  it('drops weeks outside the horizon', () => {
    const listings = buildListings([source({
      projections: [
        projection('past', PADI, '2026-08-24', '2026-08-30', 10),
        projection('far', PADI, '2027-01-04', '2027-01-10', 10),
        projection('inside', PADI, '2026-09-07', '2026-09-13', 10),
      ],
    })], FROM, 12)

    expect(listings).toHaveLength(1)
    expect(listings[0].blockIds).toEqual(['inside'])
  })
})

describe('filterListings', () => {
  const listings = buildListings([source({
    projections: [
      projection('b1', PADI, '2026-09-07', '2026-09-13', 36.7),
      projection('b2', JAGUNG, '2026-09-07', '2026-09-13', 4),
      projection('b3', PADI, '2026-11-02', '2026-11-08', 20),
    ],
  })], FROM)

  it('returns everything when no filter is set', () => {
    expect(filterListings(listings, {}, FROM)).toHaveLength(3)
  })

  it('filters by commodity', () => {
    expect(filterListings(listings, { commodityId: JAGUNG }, FROM)).toHaveLength(1)
  })

  it('filters by minimum tonnage', () => {
    expect(filterListings(listings, { minTonnes: 10 }, FROM)).toHaveLength(2)
  })

  it('filters by weeks ahead', () => {
    expect(filterListings(listings, { weeksAhead: 4 }, FROM)).toHaveLength(2)
  })

  it('combines filters', () => {
    expect(filterListings(listings, { commodityId: PADI, weeksAhead: 4 }, FROM))
      .toHaveLength(1)
  })

  it('filters by province', () => {
    expect(filterListings(listings, { province: 'Bali' }, FROM)).toHaveLength(0)
    expect(filterListings(listings, { province: 'Jawa Barat' }, FROM)).toHaveLength(3)
  })
})

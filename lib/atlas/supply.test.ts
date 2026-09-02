import { describe, expect, it } from 'vitest'

import { utcDate } from '@/lib/agronomy/dates'
import type { AtlasCooperative } from '@/lib/atlas/load'
import {
  peakTonnes, regionKey, supplyByProvince, supplyByRegency, supplyStep,
} from '@/lib/atlas/supply'
import type { Listing } from '@/lib/catalog/listings'

function coop(over: Partial<AtlasCooperative> = {}): AtlasCooperative {
  return {
    id: 'c1',
    name: 'KT Uji',
    village: 'Sukamaju',
    district: 'Kabupaten Subang',
    province: 'Jawa Barat',
    lat: -6.5,
    lng: 107.7,
    plotCount: 2,
    hectares: 5.5,
    ...over,
  }
}

function listing(over: Partial<Listing> = {}): Listing {
  return {
    id: 'l1',
    cooperativeId: 'c1',
    cooperativeName: 'KT Uji',
    province: 'Jawa Barat',
    district: 'Kabupaten Subang',
    village: 'Sukamaju',
    commodityId: 'padi',
    commodityName: 'Padi',
    varietyName: null,
    isoWeek: '2026-W40',
    weekStart: utcDate('2026-09-28'),
    weekEnd: utcDate('2026-10-04'),
    tonnes: 10,
    blockIds: [],
    basis: 'observed',
    ...over,
  }
}

describe('regionKey', () => {
  it('strips the administrative prefix the boundary data does not carry', () => {
    expect(regionKey('Kabupaten Subang')).toBe('subang')
    expect(regionKey('Kota Bandung')).toBe('bandung')
    expect(regionKey('Provinsi Jawa Barat')).toBe('jawa barat')
  })

  it('leaves a name that has no prefix alone', () => {
    expect(regionKey('Jawa Barat')).toBe('jawa barat')
  })

  it('matches the two spellings of the same regency to one key', () => {
    expect(regionKey('Kabupaten Subang')).toBe(regionKey('Subang'))
  })
})

describe('supplyByProvince', () => {
  it('sums cooperatives, plots and hectares into their province', () => {
    const regions = supplyByProvince(
      [coop({ id: 'a', plotCount: 2, hectares: 5.5 }), coop({ id: 'b', plotCount: 3, hectares: 4.5 })],
      [],
    )

    expect(regions.get('jawa barat')).toMatchObject({
      cooperatives: 2, plots: 5, hectares: 10, tonnes: 0,
    })
  })

  it('adds projected tonnage and keeps the listings behind it', () => {
    const regions = supplyByProvince(
      [coop()],
      [listing({ id: 'l1', tonnes: 10 }), listing({ id: 'l2', tonnes: 4.5 })],
    )

    const jabar = regions.get('jawa barat')
    expect(jabar?.tonnes).toBe(14.5)
    expect(jabar?.listings).toHaveLength(2)
  })

  it('ignores a listing whose region has no registered cooperative', () => {
    // The map can only shade a shape it can join to a cooperative; a listing
    // from nowhere must not conjure a region.
    const regions = supplyByProvince([coop()], [listing({ province: 'Bali' })])

    expect(regions.has('bali')).toBe(false)
    expect(regions.get('jawa barat')?.tonnes).toBe(0)
  })
})

describe('supplyByRegency', () => {
  it('joins "Kabupaten Subang" and the boundary data spelling to one region', () => {
    const regions = supplyByRegency([coop()], [listing({ district: 'Subang' })])

    expect([...regions.keys()]).toEqual(['subang'])
    expect(regions.get('subang')).toMatchObject({ cooperatives: 1, tonnes: 10 })
  })
})

describe('supplyStep', () => {
  it('reads registered-with-nothing-projected as its own step, not as a little', () => {
    expect(supplyStep(0, 100)).toBe(0)
  })

  it('spreads tonnage across four quartiles of the heaviest region', () => {
    expect(supplyStep(1, 100)).toBe(1)
    expect(supplyStep(25, 100)).toBe(1)
    expect(supplyStep(26, 100)).toBe(2)
    expect(supplyStep(51, 100)).toBe(3)
    expect(supplyStep(76, 100)).toBe(4)
    expect(supplyStep(100, 100)).toBe(4)
  })

  it('never exceeds the top step when a region somehow beats the peak', () => {
    expect(supplyStep(180, 100)).toBe(4)
  })

  it('falls back to the first step when there is no peak to scale against', () => {
    expect(supplyStep(5, 0)).toBe(1)
  })
})

describe('peakTonnes', () => {
  it('finds the heaviest region', () => {
    const regions = supplyByProvince(
      [coop({ id: 'a' }), coop({ id: 'b', province: 'Bali', district: 'Tabanan' })],
      [listing({ tonnes: 10 }), listing({ id: 'l2', province: 'Bali', district: 'Tabanan', tonnes: 42 })],
    )

    expect(peakTonnes(regions.values())).toBe(42)
  })

  it('is zero when nothing is projected anywhere', () => {
    expect(peakTonnes(supplyByProvince([coop()], []).values())).toBe(0)
  })
})

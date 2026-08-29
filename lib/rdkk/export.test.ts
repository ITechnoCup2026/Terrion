import { describe, it, expect } from 'vitest'
import { aggregateInputs } from './aggregate'
import type { FertiliserRate, PlantedBlock } from './aggregate'
import { buildRdkkDocument } from './export'

const RATES: FertiliserRate[] = [
  { commodityId: 'padi', inputItem: 'urea', kgPerHa: 250, source: 'Permentan 40/2007' },
  { commodityId: 'padi', inputItem: 'sp36', kgPerHa: 100, source: 'Permentan 40/2007' },
  { commodityId: 'jagung', inputItem: 'urea', kgPerHa: 300, source: 'Kementan jagung' },
]

const block = (over: Partial<PlantedBlock> = {}): PlantedBlock => ({
  blockId: 'b1',
  memberId: 'm1',
  memberName: 'Pak Ujang',
  commodityId: 'padi',
  areaHa: 1,
  ...over,
})

const META = {
  cooperativeName: 'Koperasi Tani Subang Jaya',
  village: 'Pamanukan',
  district: 'Kabupaten Subang',
  province: 'Jawa Barat',
  seasonLabel: 'musim ini',
  printedAt: new Date('2026-08-27T00:00:00Z'),
}

const build = (blocks: PlantedBlock[], rates = RATES) =>
  buildRdkkDocument(aggregateInputs({ blocks, rates }), META)

describe('buildRdkkDocument — nothing planted', () => {
  it('produces no columns and no rows rather than an empty grid', () => {
    const doc = build([])
    expect(doc.columns).toEqual([])
    expect(doc.rows).toEqual([])
    expect(doc.totals).toEqual([])
    expect(doc.sources).toEqual([])
  })
})

describe('buildRdkkDocument — the grid', () => {
  it('takes columns from the union of input items across every member', () => {
    // Pak Ujang grows padi (urea + sp36), Bu Iis grows jagung (urea only).
    const doc = build([
      block({ memberId: 'm1', memberName: 'Pak Ujang', commodityId: 'padi' }),
      block({ blockId: 'b2', memberId: 'm2', memberName: 'Bu Iis', commodityId: 'jagung' }),
    ])
    expect(doc.columns).toEqual(['sp36', 'urea'])
  })

  it('leaves a member null for an input they need none of, never zero', () => {
    const doc = build([
      block({ memberId: 'm1', memberName: 'Pak Ujang', commodityId: 'padi' }),
      block({ blockId: 'b2', memberId: 'm2', memberName: 'Bu Iis', commodityId: 'jagung' }),
    ])
    const iis = doc.rows.find(r => r.memberName === 'Bu Iis')!
    // Columns are ['sp36', 'urea']; Bu Iis has no sp36 requirement at all.
    expect(iis.quantitiesKg[0]).toBeNull()
    expect(iis.quantitiesKg[1]).toBeCloseTo(300, 5)
  })

  it('orders rows by member name so two prints of one season match', () => {
    const doc = build([
      block({ memberId: 'm2', memberName: 'Pak Ujang' }),
      block({ blockId: 'b2', memberId: 'm1', memberName: 'Bu Iis' }),
    ])
    expect(doc.rows.map(r => r.memberName)).toEqual(['Bu Iis', 'Pak Ujang'])
  })
})

describe('buildRdkkDocument — totals', () => {
  it('carries the aggregate own totals rather than re-summing the grid', () => {
    const aggregate = aggregateInputs({
      blocks: [block({ areaHa: 2 }), block({ blockId: 'b2', memberId: 'm2', memberName: 'Bu Iis', areaHa: 1 })],
      rates: RATES,
    })
    const doc = buildRdkkDocument(aggregate, META)
    const urea = doc.columns.indexOf('urea')
    // 3 ha of padi at 250 kg/ha.
    expect(doc.totals[urea]).toBeCloseTo(750, 5)
    expect(doc.totals[urea]).toBeCloseTo(
      aggregate.totals.find(t => t.inputItem === 'urea')!.quantityKg, 5)
  })
})

describe('buildRdkkDocument — what the form must not hide', () => {
  it('lists every rate document behind the numbers, once each', () => {
    const doc = build([
      block({ commodityId: 'padi' }),
      block({ blockId: 'b2', memberId: 'm2', memberName: 'Bu Iis', commodityId: 'jagung' }),
    ])
    expect(doc.sources).toEqual(['Kementan jagung', 'Permentan 40/2007'])
  })

  it('carries an unverified source through to the form', () => {
    const doc = build([block({ commodityId: 'cabai' })], [
      { commodityId: 'cabai', inputItem: 'urea', kgPerHa: 200, source: 'BELUM DIVERIFIKASI' },
    ])
    expect(doc.sources).toContain('BELUM DIVERIFIKASI')
  })

  it('counts members over the subsidy cap and keeps their excess', () => {
    const doc = build([
      block({ memberId: 'm1', memberName: 'Pak Ujang', areaHa: 3.5 }),
      block({ blockId: 'b2', memberId: 'm2', memberName: 'Bu Iis', areaHa: 1 }),
    ])
    expect(doc.membersOverCap).toBe(1)
    const ujang = doc.rows.find(r => r.memberName === 'Pak Ujang')!
    expect(ujang.overSubsidyCap).toBe(true)
    expect(ujang.excessHa).toBeCloseTo(1.5, 5)
  })

  it('names commodities that have no published rate', () => {
    // Beri is planted but no rate exists for it, so its area orders nothing.
    const doc = build([block({ commodityId: 'beri' })])
    expect(doc.commoditiesWithoutRates).toEqual(['beri'])
  })
})

describe('buildRdkkDocument — the letterhead', () => {
  it('carries the cooperative identity the form has to be filed under', () => {
    const doc = build([block()])
    expect(doc.meta.cooperativeName).toBe('Koperasi Tani Subang Jaya')
    expect(doc.meta.district).toBe('Kabupaten Subang')
    expect(doc.meta.province).toBe('Jawa Barat')
    expect(doc.meta.seasonLabel).toBe('musim ini')
  })

  it('reports the planted area the form covers', () => {
    const doc = build([
      block({ memberId: 'm1', areaHa: 2 }),
      block({ blockId: 'b2', memberId: 'm2', memberName: 'Bu Iis', areaHa: 1.5 }),
    ])
    expect(doc.totalPlantedHa).toBeCloseTo(3.5, 5)
    expect(doc.memberCount).toBe(2)
  })
})

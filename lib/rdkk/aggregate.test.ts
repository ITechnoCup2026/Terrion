import { describe, it, expect } from 'vitest'
import { aggregateInputs, SUBSIDY_CAP_HA } from './aggregate'
import type { FertiliserRate, PlantedBlock, RequirementLine } from './aggregate'

// Deliberately round numbers so the arithmetic in each expectation is legible.
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

const lineFor = (lines: RequirementLine[], item: string) =>
  lines.find(l => l.inputItem === item)

describe('aggregateInputs — nothing planted', () => {
  it('returns empty members and totals rather than fabricating rows', () => {
    const result = aggregateInputs({ blocks: [], rates: RATES })
    expect(result.members).toEqual([])
    expect(result.totals).toEqual([])
    expect(result.commoditiesWithoutRates).toEqual([])
  })
})

describe('aggregateInputs — quantities', () => {
  it('multiplies the published rate by the planted area', () => {
    const { members } = aggregateInputs({
      blocks: [block({ areaHa: 1.2 })],
      rates: RATES,
    })
    expect(members).toHaveLength(1)
    expect(lineFor(members[0].lines, 'urea')!.quantityKg).toBeCloseTo(300, 5)
    expect(lineFor(members[0].lines, 'sp36')!.quantityKg).toBeCloseTo(120, 5)
  })

  it('sums a member area across several blocks of the same commodity', () => {
    const { members } = aggregateInputs({
      blocks: [
        block({ blockId: 'a', areaHa: 0.6 }),
        block({ blockId: 'b', areaHa: 0.4 }),
      ],
      rates: RATES,
    })
    expect(members[0].plantedHa).toBeCloseTo(1, 5)
    expect(lineFor(members[0].lines, 'urea')!.quantityKg).toBeCloseTo(250, 5)
  })

  it('adds up one input item across different commodities', () => {
    // 1 ha padi at 250 kg/ha + 0.5 ha jagung at 300 kg/ha = 400 kg urea.
    const { members } = aggregateInputs({
      blocks: [
        block({ blockId: 'a', commodityId: 'padi', areaHa: 1 }),
        block({ blockId: 'b', commodityId: 'jagung', areaHa: 0.5 }),
      ],
      rates: RATES,
    })
    expect(lineFor(members[0].lines, 'urea')!.quantityKg).toBeCloseTo(400, 5)
  })

  it('rolls every member up into cooperative totals', () => {
    const { totals } = aggregateInputs({
      blocks: [
        block({ blockId: 'a', memberId: 'm1', memberName: 'Pak Ujang', areaHa: 1 }),
        block({ blockId: 'b', memberId: 'm2', memberName: 'Bu Imas', areaHa: 1.5 }),
      ],
      rates: RATES,
    })
    expect(lineFor(totals, 'urea')!.quantityKg).toBeCloseTo(625, 5)   // 250 + 375
    expect(lineFor(totals, 'sp36')!.quantityKg).toBeCloseTo(250, 5)   // 100 + 150
  })

  it('keeps one row per member', () => {
    const { members } = aggregateInputs({
      blocks: [
        block({ blockId: 'a', memberId: 'm1', memberName: 'Pak Ujang' }),
        block({ blockId: 'b', memberId: 'm1', memberName: 'Pak Ujang' }),
        block({ blockId: 'c', memberId: 'm2', memberName: 'Bu Imas' }),
      ],
      rates: RATES,
    })
    expect(members.map(m => m.memberId).sort()).toEqual(['m1', 'm2'])
  })
})

describe('aggregateInputs — the 2 ha subsidy cap', () => {
  it('caps at 2 ha', () => {
    expect(SUBSIDY_CAP_HA).toBe(2)
  })

  it('flags a member past the cap without cutting their quantities', () => {
    const { members } = aggregateInputs({
      blocks: [block({ areaHa: 3 })],
      rates: RATES,
    })
    expect(members[0].overSubsidyCap).toBe(true)
    expect(members[0].excessHa).toBeCloseTo(1, 5)
    // The requirement still describes all 3 ha — truncating here would hide
    // the shortfall instead of putting it in front of the pengurus.
    expect(lineFor(members[0].lines, 'urea')!.quantityKg).toBeCloseTo(750, 5)
  })

  it('does not flag a member sitting exactly on the cap', () => {
    const { members } = aggregateInputs({
      blocks: [block({ areaHa: 2 })],
      rates: RATES,
    })
    expect(members[0].overSubsidyCap).toBe(false)
    expect(members[0].excessHa).toBe(0)
  })

  it('applies the cap per farmer, not across the cooperative', () => {
    // 3 ha in total, but no individual is over — the subsidy rule is per person.
    const { members } = aggregateInputs({
      blocks: [
        block({ blockId: 'a', memberId: 'm1', memberName: 'Pak Ujang', areaHa: 1.5 }),
        block({ blockId: 'b', memberId: 'm2', memberName: 'Bu Imas', areaHa: 1.5 }),
      ],
      rates: RATES,
    })
    expect(members.every(m => m.overSubsidyCap)).toBe(false)
  })

  it('counts a farmer past the cap through several small blocks', () => {
    const { members } = aggregateInputs({
      blocks: [
        block({ blockId: 'a', areaHa: 1.2 }),
        block({ blockId: 'b', areaHa: 1.1 }),
      ],
      rates: RATES,
    })
    expect(members[0].overSubsidyCap).toBe(true)
    expect(members[0].excessHa).toBeCloseTo(0.3, 5)
  })
})

describe('aggregateInputs — provenance', () => {
  it('carries every distinct rate source through to the totals', () => {
    const { totals } = aggregateInputs({
      blocks: [
        block({ blockId: 'a', commodityId: 'padi' }),
        block({ blockId: 'b', commodityId: 'jagung' }),
      ],
      rates: RATES,
    })
    expect(lineFor(totals, 'urea')!.sources.sort())
      .toEqual(['Kementan jagung', 'Permentan 40/2007'])
  })

  it('does not repeat a source shared by several members', () => {
    const { totals } = aggregateInputs({
      blocks: [
        block({ blockId: 'a', memberId: 'm1', memberName: 'Pak Ujang' }),
        block({ blockId: 'b', memberId: 'm2', memberName: 'Bu Imas' }),
      ],
      rates: RATES,
    })
    expect(lineFor(totals, 'urea')!.sources).toEqual(['Permentan 40/2007'])
  })

  it('names commodities that have no published rate instead of dropping them', () => {
    const { members, commoditiesWithoutRates } = aggregateInputs({
      blocks: [
        block({ blockId: 'a', commodityId: 'padi', areaHa: 1 }),
        block({ blockId: 'b', commodityId: 'beri', areaHa: 1 }),
      ],
      rates: RATES,
    })
    expect(commoditiesWithoutRates).toEqual(['beri'])
    // The area still counts toward the cap even though nothing can be ordered.
    expect(members[0].plantedHa).toBeCloseTo(2, 5)
    expect(lineFor(members[0].lines, 'urea')!.quantityKg).toBeCloseTo(250, 5)
  })
})

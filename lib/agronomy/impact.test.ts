import { describe, it, expect } from 'vitest'
import { computeImpact } from './impact'
import type { HarvestedBlock, OrderLine, ReferencePrice, StaggerRecord } from './impact'
import type { BlockProjection } from './types'
import { utcDate } from './dates'

const EMPTY = {
  blocks: [] as HarvestedBlock[],
  referencePrices: [] as ReferencePrice[],
  orderLines: [] as OrderLine[],
  staggerApplied: [] as StaggerRecord[],
  projections: [] as BlockProjection[],
  capacity: null,
}

// A harvested block with every actual filled in; override what a test cares about.
const harvested = (over: Partial<HarvestedBlock> = {}): HarvestedBlock => ({
  blockId: 'b1',
  commodityId: 'padi',
  actualHarvestDate: utcDate('2026-03-02'),
  actualYieldKg: 1000,
  actualPricePerKg: 6800,
  paymentReceivedDate: utcDate('2026-03-16'),
  ...over,
})

const line = (over: Partial<OrderLine> = {}): OrderLine => ({
  quantity: 10,
  retailPricePerUnit: 15000,
  bulkPricePerUnit: 13000,
  status: 'completed',
  ...over,
})

describe('computeImpact — empty inputs', () => {
  it('returns null for every figure when nothing has happened yet', () => {
    expect(computeImpact(EMPTY)).toEqual({
      priceVsReference: null,
      daysToPayment: null,
      inputCostSaved: null,
      tonnesDiverted: null,
    })
  })
})

describe('figure 1 — effective price against the local reference', () => {
  it('returns the gap in rupiah per kg over the reference for that harvest week', () => {
    const { priceVsReference } = computeImpact({
      ...EMPTY,
      blocks: [harvested({ actualPricePerKg: 6800 })],
      referencePrices: [
        { commodityId: 'padi', weekStart: utcDate('2026-03-02'), pricePerKg: 6500 },
      ],
    })
    expect(priceVsReference).toBeCloseTo(300, 5)
  })

  it('weights by tonnage, so a large block moves the figure more than a small one', () => {
    // 9000 kg at +400 and 1000 kg at -400 ⇒ +320, not the unweighted 0.
    const { priceVsReference } = computeImpact({
      ...EMPTY,
      blocks: [
        harvested({ blockId: 'big', actualYieldKg: 9000, actualPricePerKg: 6900 }),
        harvested({ blockId: 'small', actualYieldKg: 1000, actualPricePerKg: 6100 }),
      ],
      referencePrices: [
        { commodityId: 'padi', weekStart: utcDate('2026-03-02'), pricePerKg: 6500 },
      ],
    })
    expect(priceVsReference).toBeCloseTo(320, 5)
  })

  it('is null when no reference price covers the harvest week', () => {
    const { priceVsReference } = computeImpact({
      ...EMPTY,
      blocks: [harvested()],
      referencePrices: [
        { commodityId: 'padi', weekStart: utcDate('2025-01-06'), pricePerKg: 6500 },
      ],
    })
    expect(priceVsReference).toBeNull()
  })

  it('ignores blocks that were harvested but not yet priced', () => {
    const { priceVsReference } = computeImpact({
      ...EMPTY,
      blocks: [
        harvested({ blockId: 'priced', actualPricePerKg: 6800 }),
        harvested({ blockId: 'unpriced', actualPricePerKg: null }),
      ],
      referencePrices: [
        { commodityId: 'padi', weekStart: utcDate('2026-03-02'), pricePerKg: 6500 },
      ],
    })
    expect(priceVsReference).toBeCloseTo(300, 5)
  })

  it('reports a real zero when the cooperative matched the reference exactly', () => {
    const { priceVsReference } = computeImpact({
      ...EMPTY,
      blocks: [harvested({ actualPricePerKg: 6500 })],
      referencePrices: [
        { commodityId: 'padi', weekStart: utcDate('2026-03-02'), pricePerKg: 6500 },
      ],
    })
    expect(priceVsReference).toBe(0)
  })
})

describe('figure 2 — days from harvest to payment', () => {
  it('averages the gap across blocks where both dates are set', () => {
    const { daysToPayment } = computeImpact({
      ...EMPTY,
      blocks: [
        harvested({
          blockId: 'a',
          actualHarvestDate: utcDate('2026-03-02'),
          paymentReceivedDate: utcDate('2026-03-16'),   // 14 days
        }),
        harvested({
          blockId: 'b',
          actualHarvestDate: utcDate('2026-03-02'),
          paymentReceivedDate: utcDate('2026-03-22'),   // 20 days
        }),
      ],
    })
    expect(daysToPayment).toBeCloseTo(17, 5)
  })

  it('ignores blocks still waiting to be paid', () => {
    const { daysToPayment } = computeImpact({
      ...EMPTY,
      blocks: [
        harvested({ blockId: 'paid', paymentReceivedDate: utcDate('2026-03-16') }),
        harvested({ blockId: 'unpaid', paymentReceivedDate: null }),
      ],
    })
    expect(daysToPayment).toBeCloseTo(14, 5)
  })

  it('is null when nothing has been paid, rather than reporting zero days', () => {
    const { daysToPayment } = computeImpact({
      ...EMPTY,
      blocks: [harvested({ paymentReceivedDate: null })],
    })
    expect(daysToPayment).toBeNull()
  })
})

describe('figure 3 — input cost saved through group purchasing', () => {
  it('sums quantity times the gap between retail and bulk', () => {
    const { inputCostSaved } = computeImpact({
      ...EMPTY,
      orderLines: [
        line({ quantity: 10, retailPricePerUnit: 15000, bulkPricePerUnit: 13000 }),
        line({ quantity: 4, retailPricePerUnit: 9000, bulkPricePerUnit: 8500 }),
      ],
    })
    expect(inputCostSaved).toBeCloseTo(22000, 5)   // 10×2000 + 4×500
  })

  it('counts completed orders only', () => {
    const { inputCostSaved } = computeImpact({
      ...EMPTY,
      orderLines: [
        line({ status: 'completed' }),
        line({ status: 'draft' }),
        line({ status: 'submitted' }),
      ],
    })
    expect(inputCostSaved).toBeCloseTo(20000, 5)
  })

  it('reports a real zero when bulk buying saved nothing', () => {
    const { inputCostSaved } = computeImpact({
      ...EMPTY,
      orderLines: [line({ retailPricePerUnit: 13000, bulkPricePerUnit: 13000 })],
    })
    expect(inputCostSaved).toBe(0)
  })

  it('is null when no order has completed, rather than claiming zero saved', () => {
    const { inputCostSaved } = computeImpact({
      ...EMPTY,
      orderLines: [line({ status: 'draft' })],
    })
    expect(inputCostSaved).toBeNull()
  })

  it('ignores lines with no price on either side', () => {
    const { inputCostSaved } = computeImpact({
      ...EMPTY,
      orderLines: [
        line({ quantity: 10, retailPricePerUnit: 15000, bulkPricePerUnit: 13000 }),
        line({ retailPricePerUnit: null }),
        line({ bulkPricePerUnit: null }),
      ],
    })
    expect(inputCostSaved).toBeCloseTo(20000, 5)
  })
})

describe('figure 4 — tonnes diverted from collision weeks', () => {
  // Four blocks of the same commodity all landing in one week. Two were shifted
  // a week later by an accepted staggering suggestion.
  const week = (blockId: string, start: string, tonnes: number): BlockProjection => ({
    blockId, plotId: `p-${blockId}`, commodityId: 'padi',
    window: { start: utcDate(start), end: utcDate(start) },
    expectedTonnes: tonnes,
  })

  it('is null when no staggering has been accepted', () => {
    const { tonnesDiverted } = computeImpact({
      ...EMPTY,
      projections: [week('a', '2026-09-07', 10), week('b', '2026-09-07', 10)],
      staggerApplied: [],
    })
    expect(tonnesDiverted).toBeNull()
  })

  it('measures what the accepted shift took out of the flagged week', () => {
    const { tonnesDiverted } = computeImpact({
      ...EMPTY,
      capacity: new Map([['padi', 20]]),
      // Current state: 20 t in the peak week, 20 t in the following week.
      projections: [
        week('a', '2026-09-07', 10), week('b', '2026-09-07', 10),
        week('c', '2026-09-14', 10), week('d', '2026-09-14', 10),
      ],
      // c and d were originally in the peak week too — 40 t against a 20 t capacity.
      staggerApplied: [
        { seasonLabel: '2026', blockId: 'c',
          originalDate: utcDate('2026-09-07'), shiftedDate: utcDate('2026-09-14') },
        { seasonLabel: '2026', blockId: 'd',
          originalDate: utcDate('2026-09-07'), shiftedDate: utcDate('2026-09-14') },
      ],
    })
    expect(tonnesDiverted).toBeCloseTo(20, 5)
  })

  it('reports a real zero when the shift did not relieve any flagged week', () => {
    const { tonnesDiverted } = computeImpact({
      ...EMPTY,
      capacity: new Map([['padi', 100]]),   // nothing ever collides
      projections: [week('a', '2026-09-07', 10), week('b', '2026-09-14', 10)],
      staggerApplied: [
        { seasonLabel: '2026', blockId: 'b',
          originalDate: utcDate('2026-09-07'), shiftedDate: utcDate('2026-09-14') },
      ],
    })
    expect(tonnesDiverted).toBe(0)
  })

  it('ignores stagger records for blocks that no longer have a projection', () => {
    const { tonnesDiverted } = computeImpact({
      ...EMPTY,
      capacity: new Map([['padi', 20]]),
      projections: [week('a', '2026-09-07', 10), week('b', '2026-09-07', 10)],
      staggerApplied: [
        { seasonLabel: '2026', blockId: 'deleted',
          originalDate: utcDate('2026-09-07'), shiftedDate: utcDate('2026-09-14') },
      ],
    })
    expect(tonnesDiverted).toBe(0)
  })
})

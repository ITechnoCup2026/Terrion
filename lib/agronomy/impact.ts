// The four dashboard figures from spec §6.7, each computed from data rather
// than asserted.
//
// Every figure is `number | null`. `null` means the inputs do not exist yet and
// the dashboard renders "Belum ada data musim ini"; `0` means zero is the real
// answer — the cooperative matched the reference price exactly, or bulk buying
// saved nothing. Returning 0 for "no data" would turn an absence into a claim,
// which is the one thing these figures must not do.

import { detectCollisions } from './collide'
import { daysBetween, isoWeekKey } from './dates'
import type { BlockProjection } from './types'

/** A block far enough along to contribute to figures 1 and 2. Each actual is
 *  nullable because a block is harvested, priced and paid at different times. */
export type HarvestedBlock = {
  blockId: string
  commodityId: string
  actualHarvestDate: Date | null
  actualYieldKg: number | null
  actualPricePerKg: number | null
  paymentReceivedDate: Date | null
}

/** One week's farm-gate reference price for a commodity in the province. */
export type ReferencePrice = {
  commodityId: string
  weekStart: Date
  pricePerKg: number
}

/** A line on a group input order. Prices are null until the order is quoted. */
export type OrderLine = {
  quantity: number
  retailPricePerUnit: number | null
  bulkPricePerUnit: number | null
  status: 'draft' | 'submitted' | 'completed'
}

/** One accepted staggering suggestion, as stored in `cooperative.stagger_applied`. */
export type StaggerRecord = {
  seasonLabel: string
  blockId: string
  originalDate: Date
  shiftedDate: Date
}

export type ImpactFigures = {
  /** Rupiah per kg above (or below) the local reference, weighted by tonnage. */
  priceVsReference: number | null
  /** Mean days between harvest and payment landing. */
  daysToPayment: number | null
  /** Rupiah saved by buying inputs in bulk instead of at retail. */
  inputCostSaved: number | null
  /** Tonnes moved out of weeks that would otherwise have been over capacity. */
  tonnesDiverted: number | null
}

export type ImpactInput = {
  blocks: HarvestedBlock[]
  referencePrices: ReferencePrice[]
  orderLines: OrderLine[]
  staggerApplied: StaggerRecord[]
  projections: BlockProjection[]
  capacity: Map<string, number> | null
}

const cellKey = (commodityId: string, d: Date) => `${commodityId}|${isoWeekKey(d)}`

// Figure 1: what the cooperative actually got per kg, against the reference for
// the week it sold in. Weighted by tonnage — a 9-tonne block and a 1-tonne block
// are not equal evidence about the price the cooperative commands.
function priceVsReference(
  blocks: HarvestedBlock[], referencePrices: ReferencePrice[],
): number | null {
  const reference = new Map(
    referencePrices.map(r => [cellKey(r.commodityId, r.weekStart), r.pricePerKg]),
  )

  let weightedReceived = 0
  let weightedReference = 0
  let totalKg = 0

  for (const b of blocks) {
    if (b.actualHarvestDate == null || b.actualYieldKg == null) continue
    if (b.actualPricePerKg == null) continue
    const ref = reference.get(cellKey(b.commodityId, b.actualHarvestDate))
    // No reference for that week means there is nothing to compare against, so
    // the block sits out rather than being scored against zero.
    if (ref == null) continue

    weightedReceived += b.actualPricePerKg * b.actualYieldKg
    weightedReference += ref * b.actualYieldKg
    totalKg += b.actualYieldKg
  }

  if (totalKg === 0) return null
  return (weightedReceived - weightedReference) / totalKg
}

// Figure 2: how long the cooperative's members wait to be paid after harvest.
function daysToPayment(blocks: HarvestedBlock[]): number | null {
  const gaps: number[] = []
  for (const b of blocks) {
    if (b.actualHarvestDate == null || b.paymentReceivedDate == null) continue
    gaps.push(daysBetween(b.actualHarvestDate, b.paymentReceivedDate))
  }
  if (gaps.length === 0) return null
  return gaps.reduce((s, x) => s + x, 0) / gaps.length
}

// Figure 3: the gap between retail and bulk, across orders that actually landed.
// Draft and submitted orders are excluded — nothing has been saved until the
// cooperative has taken delivery.
function inputCostSaved(lines: OrderLine[]): number | null {
  const priced = lines.filter(l =>
    l.status === 'completed'
    && l.retailPricePerUnit != null
    && l.bulkPricePerUnit != null)

  if (priced.length === 0) return null
  return priced.reduce(
    (s, l) => s + l.quantity * (l.retailPricePerUnit! - l.bulkPricePerUnit!), 0)
}

// Figure 4: re-run L3 against the planting dates as they stood before the
// cooperative accepted a staggering suggestion, then difference the weeks that
// run flags against where that tonnage actually ended up.
function tonnesDiverted(
  projections: BlockProjection[],
  staggerApplied: StaggerRecord[],
  capacity: Map<string, number> | null,
): number | null {
  if (staggerApplied.length === 0) return null

  const shiftByBlock = new Map(staggerApplied.map(s =>
    [s.blockId, daysBetween(s.originalDate, s.shiftedDate)]))

  // Wind each shifted block's window back to where it would have fallen.
  const before = projections.map(p => {
    const shift = shiftByBlock.get(p.blockId)
    if (shift == null) return p
    return {
      ...p,
      window: {
        start: new Date(p.window.start.getTime() - shift * 86_400_000),
        end: new Date(p.window.end.getTime() - shift * 86_400_000),
      },
    }
  })

  const wouldHave = detectCollisions(before, capacity)
  const actual = detectCollisions(projections, capacity)

  const actualByWeek = new Map(
    actual.weeks.map(w => [`${w.commodityId}|${w.isoWeek}`, w.tonnes]))

  let diverted = 0
  for (const week of wouldHave.flagged) {
    const key = `${week.commodityId}|${week.isoWeek}`
    const now = actualByWeek.get(key) ?? 0
    // Only count tonnage that left. A week that grew is a different problem and
    // must not be netted off against one that shrank.
    diverted += Math.max(0, week.tonnes - now)
  }
  return diverted
}

// The four figures the dashboard renders, each null until its inputs exist.
export function computeImpact(input: ImpactInput): ImpactFigures {
  return {
    priceVsReference: priceVsReference(input.blocks, input.referencePrices),
    daysToPayment: daysToPayment(input.blocks),
    inputCostSaved: inputCostSaved(input.orderLines),
    tonnesDiverted: tonnesDiverted(input.projections, input.staggerApplied, input.capacity),
  }
}

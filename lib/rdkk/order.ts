// Turning a season's requirement totals into something a supplier can quote.
//
// The RDKK aggregate speaks in kilograms, because rates are published per
// hectare. A purchase is placed in sacks, because that is how subsidised
// fertiliser is sold. The conversion rounds up: a part sack is not purchasable,
// and rounding down would order less than the season needs -- the same silent
// under-ordering aggregate.ts refuses to do when a member passes the cap.

import type { RequirementLine } from './aggregate'

/** Indonesian subsidised fertiliser ships in 50 kg sacks. */
export const KG_PER_SACK = 50

export type OrderLineDraft = {
  item: string
  /** Whole sacks, rounded up. */
  quantity: number
  unit: string
  /** The exact requirement the sacks were rounded from, kept for the record. */
  quantityKg: number
}

/** Requirement totals as orderable whole sacks, dropping anything empty. */
export function toOrderLines(totals: RequirementLine[]): OrderLineDraft[] {
  return totals
    .filter(line => line.quantityKg > 0)
    .map(line => ({
      item: line.inputItem,
      quantity: Math.ceil(line.quantityKg / KG_PER_SACK),
      unit: `karung ${KG_PER_SACK} kg`,
      quantityKg: line.quantityKg,
    }))
}

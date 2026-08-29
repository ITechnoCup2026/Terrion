// The printable RDKK form, as a document model.
//
// `aggregateInputs` produces a ragged shape — each member carries only the
// input items they actually need. A form is a grid: every member is a row and
// every input item is a column, whether or not that farmer needs any of it.
// This turns one into the other, and it is deliberately the only place that
// reshaping happens, so the screen and the paper cannot drift apart.
//
// Two rules the form itself imposes:
//
//   A cell with no requirement is `null`, never 0. On a screen that distinction
//   is a nicety; on a form an official signs and files, a printed 0 is an order
//   for zero sacks, which is a different claim from "this farmer does not grow
//   anything this rate applies to".
//
//   Every `fertiliser_rate.source` reaches the paper. The seed data marks
//   unverified rates in the data itself, and a form that quietly drops the word
//   BELUM DIVERIFIKASI is exactly the document nobody should be signing.

import type { RdkkAggregate } from './aggregate'

/** Who the form is filed by and for which season. */
export type RdkkMeta = {
  cooperativeName: string
  village: string
  district: string
  province: string
  seasonLabel: string
  printedAt: Date
}

/** One member's line on the form. */
export type RdkkRow = {
  memberId: string
  memberName: string
  plantedHa: number
  /** One entry per column, `null` where this member needs none of that input. */
  quantitiesKg: (number | null)[]
  overSubsidyCap: boolean
  excessHa: number
}

export type RdkkDocument = {
  meta: RdkkMeta
  /** Input items, in the order the columns appear. */
  columns: string[]
  rows: RdkkRow[]
  /** One entry per column, aligned with `columns` by construction. */
  totals: (number | null)[]
  /** Every rate document behind the numbers, distinct and sorted. */
  sources: string[]
  memberCount: number
  totalPlantedHa: number
  /** How many members are over the per-farmer subsidy cap. The form shows them
   *  rather than truncating, so whoever signs it can see what they are signing. */
  membersOverCap: number
  /** Planted this season with no published rate — area that orders nothing. */
  commoditiesWithoutRates: string[]
}

// Reshape a season's aggregate into the grid a printed form needs.
export function buildRdkkDocument(
  aggregate: RdkkAggregate, meta: RdkkMeta,
): RdkkDocument {
  // The aggregate's totals accumulate every member's lines, so they already are
  // the union of input items, already sorted. Taking columns from them rather
  // than re-deriving the union means the totals row cannot fall out of step
  // with the header — the two are the same list read twice.
  const columns = aggregate.totals.map(t => t.inputItem)

  const rows: RdkkRow[] = aggregate.members.map(member => {
    const byItem = new Map(member.lines.map(l => [l.inputItem, l.quantityKg]))
    return {
      memberId: member.memberId,
      memberName: member.memberName,
      plantedHa: member.plantedHa,
      quantitiesKg: columns.map(item => byItem.get(item) ?? null),
      overSubsidyCap: member.overSubsidyCap,
      excessHa: member.excessHa,
    }
  })

  const sources = [...new Set(aggregate.totals.flatMap(t => t.sources))].sort()

  return {
    meta,
    columns,
    rows,
    totals: aggregate.totals.map(t => t.quantityKg),
    sources,
    memberCount: rows.length,
    totalPlantedHa: rows.reduce((sum, r) => sum + r.plantedHa, 0),
    membersOverCap: rows.filter(r => r.overSubsidyCap).length,
    commoditiesWithoutRates: aggregate.commoditiesWithoutRates,
  }
}

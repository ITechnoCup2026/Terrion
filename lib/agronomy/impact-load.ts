/**
 * This repo has no backend attached -- the Supabase project this used to read
 * harvested blocks, prices and orders from was removed. The only caller
 * (the dashboard) sits behind a currentAppUser() guard that always redirects
 * before this would run. Kept as a stub, rather than deleted, so that page
 * still type-checks.
 */

import type { BlockProjection } from './types'
import type { ImpactFigures } from './impact'

export async function loadImpact(_input: {
  cooperativeId: string
  projections: BlockProjection[]
  capacity: Map<string, number> | null
}): Promise<ImpactFigures> {
  return {
    priceVsReference: null,
    daysToPayment: null,
    inputCostSaved: null,
    tonnesDiverted: null,
  }
}

/**
 * This repo has no backend attached -- the Supabase project this used to
 * aggregate plantings from was removed. Every caller sits behind a
 * currentAppUser() guard that always redirects before this would run. Kept
 * as a stub, rather than deleted, so those pages still type-check.
 */

import type { RdkkAggregate } from './aggregate'

export type Season = { label: string; start: Date; end: Date }

export async function loadSeasonInputs(
  _cooperativeId: string, _season: Season,
): Promise<RdkkAggregate> {
  return { members: [], totals: [], commoditiesWithoutRates: [] }
}

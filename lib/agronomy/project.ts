/**
 * This repo has no backend attached -- the Supabase project this used to read
 * blocks and weather from was removed. Every caller sits behind a
 * currentAppUser() guard that always redirects before this would run. Kept
 * as a stub, rather than deleted, so those pages still type-check.
 */

import type { BlockProjection, HarvestWindow } from './types'

export async function projectCooperative(
  _cooperativeId: string, _now = new Date(),
): Promise<{ projections: BlockProjection[]; windows: Map<string, HarvestWindow> }> {
  return { projections: [], windows: new Map() }
}

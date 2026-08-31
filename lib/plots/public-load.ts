/**
 * This repo has no backend attached -- the Supabase project this used to read
 * public plots from was removed. The shared garden page is public (no
 * session, no gate), so it renders straight through: a missing plot is
 * indistinguishable from an unreachable backend, and both are `notFound()`.
 * Re-wire these to a real data source when the backend comes back.
 */

import type { HarvestWindow } from '@/lib/agronomy/types'
import type { PlotNeighbour } from '@/lib/plots/siblings'

export type PublicBlock = {
  id: string
  label: string
  areaHa: number
  orderIndex: number
  commodityName: string
  varietyName: string
  spriteRow: number
  plantingDate: Date
  window: HarvestWindow | null
  yieldRangeTonnes: { min: number; max: number } | null
}

export type PublicPlot = {
  publicId: string
  name: string
  areaHa: number
  memberName: string
  village: string
  district: string
  blocks: PublicBlock[]
  degraded: boolean
  terrainSeed: number
}

export async function loadPublicPlot(_publicId: string): Promise<PublicPlot | null> {
  return null
}

export type CooperativePlots = {
  cooperativeName: string | null
  plots: PlotNeighbour[]
}

export async function loadCooperativePlots(
  _village: string, _district: string,
): Promise<CooperativePlots> {
  return { cooperativeName: null, plots: [] }
}

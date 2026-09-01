import { utcDate } from '@/lib/agronomy/dates'
import type { HarvestWindow } from '@/lib/agronomy/types'
import { apiFetch, isNotFound } from '@/lib/api/client'
import type { HarvestWindowRaw, PublicBlockRaw, PublicPlotResponseRaw } from '@/lib/api/types'
import type { Neighbours, PlotNeighbour } from '@/lib/plots/siblings'

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
  cooperativeName: string
  blocks: PublicBlock[]
  degraded: boolean
  terrainSeed: number
  neighbours: Neighbours
}

function toHarvestWindow(raw: HarvestWindowRaw): HarvestWindow {
  return {
    start: utcDate(raw.start),
    end: utcDate(raw.end),
    confidence: 0.8,
    gddAccumulated: raw.gdd_accumulated,
    gddRequired: raw.gdd_required,
    stage: raw.stage,
    basis: raw.basis,
    plausibility: raw.plausibility,
    cumulativeGdd: raw.cumulative_gdd ?? [],
  }
}

function toBlock(raw: PublicBlockRaw): PublicBlock {
  return {
    id: raw.id,
    label: raw.label,
    areaHa: raw.area_ha,
    orderIndex: raw.order_index,
    commodityName: raw.commodity_name,
    varietyName: raw.variety_name,
    spriteRow: raw.sprite_row,
    plantingDate: utcDate(raw.planting_date),
    window: raw.window ? toHarvestWindow(raw.window) : null,
    yieldRangeTonnes: raw.yield_range_tonnes,
  }
}

function toNeighbour(raw: { public_id: string; name: string; member_name: string; area_ha: number }): PlotNeighbour {
  return { publicId: raw.public_id, name: raw.name, memberName: raw.member_name, areaHa: raw.area_ha }
}

/**
 * GET /api/public/plots/:publicId already embeds this plot's neighbours
 * (position/total/previous/next/others) in the same response, so there is no
 * separate "list plots by village/district" call to make.
 *
 * null means 404 and nothing else. A backend that is down answers 502, and
 * swallowing that into null would show a farmer's family "kebun tidak
 * ditemukan" for a garden that is still very much there -- they would stop
 * opening the link. Every other failure is rethrown to the error boundary,
 * which at least says to try again.
 */
export async function loadPublicPlot(publicId: string): Promise<PublicPlot | null> {
  try {
    const raw = await apiFetch<PublicPlotResponseRaw>(`/api/public/plots/${publicId}`)
    return {
      publicId: raw.public_id,
      name: raw.name,
      areaHa: raw.area_ha,
      memberName: raw.member_name,
      village: raw.village,
      district: raw.district,
      cooperativeName: raw.cooperative_name,
      degraded: raw.degraded,
      terrainSeed: raw.terrain_seed,
      blocks: raw.blocks.map(toBlock),
      neighbours: {
        position: raw.neighbours.position,
        total: raw.neighbours.total,
        previous: raw.neighbours.previous ? toNeighbour(raw.neighbours.previous) : null,
        next: raw.neighbours.next ? toNeighbour(raw.neighbours.next) : null,
        others: raw.neighbours.others.map(toNeighbour),
      },
    }
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

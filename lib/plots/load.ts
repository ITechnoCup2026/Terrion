import { utcDate } from '@/lib/agronomy/dates'
import type { HarvestWindow } from '@/lib/agronomy/types'
import { apiFetch, isNotFound } from '@/lib/api/client'
import type { HarvestWindowRaw, PlotBlockRaw, PlotDetailResponseRaw, PlotListItemRaw } from '@/lib/api/types'
import { currentSessionId } from '@/lib/auth/session'
import type { PlotSummary } from '@/lib/plots/summary'

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
    projectedFrom: raw.projected_from ? utcDate(raw.projected_from) : null,
  }
}

/**
 * GET /api/plots already returns each plot sorted by soonest harvest with
 * its window pre-computed, so this replaces summarisePlots() + a raw
 * plot/commodity read + projectCooperative() with a straight mapping.
 */
export async function loadPlots(): Promise<PlotSummary[]> {
  const sessionId = await currentSessionId()
  const raw = await apiFetch<PlotListItemRaw[]>('/api/plots', { sessionId })
  return raw.map(toPlotSummary)
}

function toPlotSummary(raw: PlotListItemRaw): PlotSummary {
  return {
    id: raw.id,
    name: raw.name,
    areaHa: raw.area_ha,
    memberName: raw.member_name,
    blockCount: raw.block_count,
    nextWindow: raw.next_window ? toHarvestWindow({ ...raw.next_window, cumulative_gdd: [] }) : null,
    expectedTonnes: raw.expected_tonnes,
    commodityIds: raw.commodity_ids,
    progress: raw.progress,
  }
}

export type PlotDetailBlock = {
  id: string
  label: string
  areaHa: number
  orderIndex: number
  commodityId: string
  commodityName: string
  spriteRow: number
  varietyId: string
  varietyName: string
  plantingDate: Date
  window: HarvestWindow | null
  expectedTonnes: number | null
}

export type PlotDetail = {
  id: string
  name: string
  publicId: string
  areaHa: number
  tileSizeM2: number
  memberName: string
  terrainSeed: number
  degraded: boolean
  hasHarvestedBlocks: boolean
  blocks: PlotDetailBlock[]
}

function toPlotDetailBlock(raw: PlotBlockRaw): PlotDetailBlock {
  return {
    id: raw.id,
    label: raw.label,
    areaHa: raw.area_ha,
    orderIndex: raw.order_index,
    commodityId: raw.commodity_id,
    commodityName: raw.commodity_name,
    spriteRow: raw.sprite_row,
    varietyId: raw.variety_id,
    varietyName: raw.variety_name,
    plantingDate: utcDate(raw.planting_date),
    window: raw.window ? toHarvestWindow(raw.window) : null,
    expectedTonnes: raw.expected_tonnes,
  }
}

/**
 * GET /api/plots/:id already returns each standing block's harvest window
 * pre-computed (GDD, stage, plausibility, daily series) -- this replaces the
 * page's raw block/commodity/variety reads plus its own loadWeatherFor() +
 * predictHarvest() pass with a straight mapping.
 *
 * null means 404, which the contract merges with "belongs to another
 * cooperative" on purpose -- a kader must not be able to probe ids that are
 * not theirs. It does NOT mean the backend failed: that is rethrown, so a
 * pengurus sees "coba lagi" rather than being told their own plot is gone.
 */
export async function loadPlot(id: string): Promise<PlotDetail | null> {
  const sessionId = await currentSessionId()
  try {
    const raw = await apiFetch<PlotDetailResponseRaw>(`/api/plots/${id}`, { sessionId })
    return {
      id: raw.id,
      name: raw.name,
      publicId: raw.public_id,
      areaHa: raw.area_ha,
      tileSizeM2: raw.tile_size_m2,
      memberName: raw.member_name,
      terrainSeed: raw.terrain_seed,
      degraded: raw.degraded,
      hasHarvestedBlocks: raw.has_harvested_blocks,
      blocks: raw.blocks.map(toPlotDetailBlock),
    }
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

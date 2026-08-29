// One row per registered plot, for the cooperative's plot list.
//
// The list answers "which of my land needs attention first", so it is ordered
// by the soonest harvest rather than by name or registration date. A plot with
// nothing growing on it still belongs in the list -- it is registered land --
// but it carries no date and no tonnage, because null is not zero.

import type { BlockProjection, HarvestWindow } from '@/lib/agronomy/types'

export type PlotRow = {
  id: string
  name: string
  areaHa: number
  memberName: string | null
}

export type PlotSummary = PlotRow & {
  blockCount: number
  /** The earliest window across the plot's blocks, or null if none is known. */
  nextWindow: HarvestWindow | null
  /** Null when nothing is projected, rather than a misleading zero. */
  expectedTonnes: number | null
  /** Every commodity standing on the plot, in block order. Drives the card's
   *  colour stripe and the commodity filter. */
  commodityIds: string[]
  /** How far the soonest block is through its heat requirement, 0..1, or null
   *  when nothing is growing. The ratio is already computed to choose the crop
   *  sprite, so showing it costs nothing. */
  progress: number | null
}

/** Fold each plot's blocks into one row, soonest harvest first. */
export function summarisePlots(input: {
  plots: PlotRow[]
  projections: BlockProjection[]
  windows: Map<string, HarvestWindow>
}): PlotSummary[] {
  const byPlot = new Map<string, BlockProjection[]>()
  for (const p of input.projections) {
    const list = byPlot.get(p.plotId) ?? []
    list.push(p)
    byPlot.set(p.plotId, list)
  }

  const summaries = input.plots.map(plot => {
    const blocks = byPlot.get(plot.id) ?? []

    // Only windows the model actually produced. A block whose window is
    // missing must not borrow another block's date.
    const known = blocks
      .map(b => input.windows.get(b.blockId))
      .filter((w): w is HarvestWindow => w != null)

    const nextWindow = known.length === 0
      ? null
      : known.reduce((a, b) => (a.start <= b.start ? a : b))

    // Clamped: a crop past its requirement has accumulated more heat than it
    // needed, and a meter reading 140% would say the opposite of "ready".
    const progress = nextWindow && nextWindow.gddRequired > 0
      ? Math.max(0, Math.min(1, nextWindow.gddAccumulated / nextWindow.gddRequired))
      : null

    return {
      ...plot,
      blockCount: blocks.length,
      nextWindow,
      expectedTonnes: blocks.length === 0
        ? null
        : blocks.reduce((sum, b) => sum + b.expectedTonnes, 0),
      commodityIds: [...new Set(blocks.map(b => b.commodityId))],
      progress,
    }
  })

  // Soonest first; plots with no known window sink to the bottom in their
  // original order rather than being dropped.
  return summaries.sort((a, b) => {
    if (a.nextWindow && b.nextWindow) {
      return a.nextWindow.start.getTime() - b.nextWindow.start.getTime()
    }
    if (a.nextWindow) return -1
    if (b.nextWindow) return 1
    return 0
  })
}

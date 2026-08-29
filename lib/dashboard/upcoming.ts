import type { BlockProjection } from '@/lib/agronomy/types'

/**
 * What comes out of the ground in the next few days.
 *
 * The dashboard answers a board's question -- which week is overloaded -- and
 * answered nothing about this week. The chart's leftmost bar says seven tonnes
 * are due; it does not say whose, and that is the one thing a pengurus needs
 * before Monday.
 *
 * A block counts when its harvest WINDOW OVERLAPS the period, not when its
 * start falls inside it. A window that opened last Thursday and closes on
 * Tuesday is very much this week's problem, and testing the start alone would
 * drop it.
 */

export type UpcomingHarvest = {
  blockId: string
  plotId: string
  plotName: string
  memberName: string | null
  commodityName: string
  tonnes: number
  start: Date
  end: Date
}

export type PlotRef = { name: string; memberName: string | null }

/** Blocks whose harvest window touches [from, to], soonest first. */
export function upcomingHarvests(input: {
  projections: BlockProjection[]
  from: Date
  to: Date
  plots: Map<string, PlotRef>
  commodities: Map<string, string>
  limit?: number
}): UpcomingHarvest[] {
  const { projections, from, to, plots, commodities } = input

  const rows = projections
    .filter(p => p.window.start <= to && p.window.end >= from)
    .map(p => {
      const plot = plots.get(p.plotId)
      return {
        blockId: p.blockId,
        plotId: p.plotId,
        // A projection whose plot did not come back is a plot the reader may
        // not see, so it is dropped rather than rendered as "Lahan tanpa nama".
        plotName: plot?.name ?? null,
        memberName: plot?.memberName ?? null,
        commodityName: commodities.get(p.commodityId) ?? 'Komoditas',
        tonnes: p.expectedTonnes,
        start: p.window.start,
        end: p.window.end,
      }
    })
    .filter((r): r is UpcomingHarvest => r.plotName !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  return input.limit == null ? rows : rows.slice(0, input.limit)
}

/** The whole tonnage due in the period, including rows past the display limit. */
export function upcomingTonnes(rows: UpcomingHarvest[]): number {
  return rows.reduce((sum, r) => sum + r.tonnes, 0)
}

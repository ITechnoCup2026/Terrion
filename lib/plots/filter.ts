import type { PlotSummary } from './summary'

/**
 * Narrowing the plot list, as pure functions over already-loaded summaries.
 *
 * Filtering happens in the browser rather than in the query, and that is a
 * deliberate trade: a cooperative has tens of plots, not thousands, and a
 * round trip per keystroke on a village connection is the worse cost. The
 * state lives in the URL so a filtered list can be sent to somebody.
 *
 * Nothing here touches the DOM or the router, so every rule below is testable
 * on its own.
 */

export type Horizon = 'all' | '30' | '90' | 'season'
export type SortKey = 'harvest' | 'name' | 'area'

export type PlotFilter = {
  /** Matches the plot name OR the farmer's name; a kader looks for both. */
  query: string
  /** Empty means every commodity. Otherwise a plot matches if it grows ANY. */
  commodityIds: string[]
  horizon: Horizon
  sort: SortKey
}

export const DEFAULT_FILTER: PlotFilter = {
  query: '', commodityIds: [], horizon: 'all', sort: 'harvest',
}

const HORIZONS: Horizon[] = ['all', '30', '90', 'season']
const SORTS: SortKey[] = ['harvest', 'name', 'area']

/** True when the filter would hide nothing, so the list is simply the list. */
export function isDefaultFilter(f: PlotFilter): boolean {
  return f.query.trim() === ''
    && f.commodityIds.length === 0
    && f.horizon === 'all'
}

type Params = { get(name: string): string | null }

/** Reads a filter out of the URL. Anything unrecognised falls back silently —
 *  a hand-edited link should narrow the list, never break the page. */
export function parsePlotFilter(params: Params): PlotFilter {
  const horizon = params.get('panen')
  const sort = params.get('urut')
  const commodities = params.get('komoditas')

  return {
    query: params.get('cari') ?? '',
    commodityIds: commodities ? commodities.split(',').filter(Boolean) : [],
    horizon: HORIZONS.includes(horizon as Horizon) ? horizon as Horizon : 'all',
    sort: SORTS.includes(sort as SortKey) ? sort as SortKey : 'harvest',
  }
}

/** Writes a filter back to a query string, omitting everything at its default
 *  so a plain list has a plain URL. */
export function plotFilterParams(f: PlotFilter): URLSearchParams {
  const params = new URLSearchParams()
  if (f.query.trim()) params.set('cari', f.query.trim())
  if (f.commodityIds.length) params.set('komoditas', f.commodityIds.join(','))
  if (f.horizon !== 'all') params.set('panen', f.horizon)
  if (f.sort !== 'harvest') params.set('urut', f.sort)
  return params
}

/**
 * The last day of the planting season `today` falls in.
 *
 * The seasons are the ones the registration form already offers as shortcuts:
 * MT I is sown in October and runs to March, MT II is sown in April and runs
 * to September. Defining "musim ini" any other way would be inventing a term
 * the rest of the product does not use.
 */
export function seasonEnd(today: Date): Date {
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth()
  if (month >= 9) return new Date(Date.UTC(year + 1, 2, 31, 23, 59, 59))   // Oct–Dec
  if (month <= 2) return new Date(Date.UTC(year, 2, 31, 23, 59, 59))       // Jan–Mar
  return new Date(Date.UTC(year, 8, 30, 23, 59, 59))                       // Apr–Sep
}

/** The latest harvest start a plot may have and still pass the horizon. */
function horizonEnd(horizon: Horizon, today: Date): Date | null {
  if (horizon === 'all') return null
  if (horizon === 'season') return seasonEnd(today)
  const days = Number(horizon)
  return new Date(today.getTime() + days * 86_400_000)
}

/** Case- and accent-insensitive contains, so "ujang" finds "Pak Ujang". */
function matches(haystack: string | null, needle: string): boolean {
  if (!haystack) return false
  return haystack.toLocaleLowerCase('id').includes(needle)
}

/** Applies a filter and its sort. Never mutates the input. */
export function filterPlots(
  plots: PlotSummary[], filter: PlotFilter, today: Date = new Date(),
): PlotSummary[] {
  const needle = filter.query.trim().toLocaleLowerCase('id')
  const cutoff = horizonEnd(filter.horizon, today)

  const kept = plots.filter(plot => {
    if (needle && !matches(plot.name, needle) && !matches(plot.memberName, needle)) {
      return false
    }
    if (filter.commodityIds.length > 0
      && !plot.commodityIds.some(id => filter.commodityIds.includes(id))) {
      return false
    }
    // A plot with nothing growing has no harvest, so it cannot fall inside a
    // harvest window. It is registered land, not a coming harvest.
    if (cutoff && (!plot.nextWindow || plot.nextWindow.start > cutoff)) return false
    return true
  })

  return sortPlots(kept, filter.sort)
}

/** Sorted copy. Plots with no known window always sink, whatever the key. */
function sortPlots(plots: PlotSummary[], sort: SortKey): PlotSummary[] {
  const copy = [...plots]
  if (sort === 'name') {
    return copy.sort((a, b) => a.name.localeCompare(b.name, 'id'))
  }
  if (sort === 'area') {
    return copy.sort((a, b) => b.areaHa - a.areaHa)
  }
  return copy.sort((a, b) => {
    if (a.nextWindow && b.nextWindow) {
      return a.nextWindow.start.getTime() - b.nextWindow.start.getTime()
    }
    if (a.nextWindow) return -1
    if (b.nextWindow) return 1
    return 0
  })
}

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_FILTER, filterPlots, isDefaultFilter, parsePlotFilter, plotFilterParams, seasonEnd,
} from './filter'
import type { PlotSummary } from './summary'

const window = (start: string) => ({
  start: new Date(start), end: new Date(start), confidence: 0.8 as const,
  gddAccumulated: 500, gddRequired: 1000, stage: 2 as never,
  basis: 'observed' as const, plausibility: 'ok' as const, cumulativeGdd: [],
})

const plot = (over: Partial<PlotSummary>): PlotSummary => ({
  id: 'p', name: 'Sawah Kidul', areaHa: 1, memberName: 'Pak Ujang',
  blockCount: 1, nextWindow: window('2026-09-10'), expectedTonnes: 5,
  commodityIds: ['padi'], progress: 0.5, ...over,
})

const today = new Date('2026-09-01T00:00:00Z')

describe('parsePlotFilter', () => {
  const params = (o: Record<string, string>) => new URLSearchParams(o)

  it('reads every field', () => {
    expect(parsePlotFilter(params({
      cari: 'ujang', komoditas: 'padi,jagung', panen: '30', urut: 'name',
    }))).toEqual({
      query: 'ujang', commodityIds: ['padi', 'jagung'], horizon: '30', sort: 'name',
    })
  })

  it('is the default filter for an empty query string', () => {
    expect(parsePlotFilter(params({}))).toEqual(DEFAULT_FILTER)
  })

  // A hand-edited link should narrow the list or do nothing — never break it.
  it('ignores values it does not recognise', () => {
    const f = parsePlotFilter(params({ panen: 'kapan-kapan', urut: 'harga' }))
    expect(f.horizon).toBe('all')
    expect(f.sort).toBe('harvest')
  })

  it('round-trips through the query string', () => {
    const f = { query: 'kidul', commodityIds: ['padi'], horizon: '90' as const, sort: 'area' as const }
    expect(parsePlotFilter(plotFilterParams(f))).toEqual(f)
  })

  it('writes no parameters at all for a default filter', () => {
    expect(plotFilterParams(DEFAULT_FILTER).toString()).toBe('')
  })
})

describe('isDefaultFilter', () => {
  it('ignores the sort, which hides nothing', () => {
    expect(isDefaultFilter({ ...DEFAULT_FILTER, sort: 'name' })).toBe(true)
  })

  it('is false once anything is narrowed', () => {
    expect(isDefaultFilter({ ...DEFAULT_FILTER, query: 'a' })).toBe(false)
    expect(isDefaultFilter({ ...DEFAULT_FILTER, commodityIds: ['padi'] })).toBe(false)
    expect(isDefaultFilter({ ...DEFAULT_FILTER, horizon: '30' })).toBe(false)
  })
})

describe('filterPlots', () => {
  const plots = [
    plot({ id: 'a', name: 'Sawah Kidul', memberName: 'Pak Ujang', areaHa: 0.75,
      commodityIds: ['padi'], nextWindow: window('2026-09-10') }),
    plot({ id: 'b', name: 'Kebun Wortel', memberName: 'Bu Nia', areaHa: 2,
      commodityIds: ['wortel'], nextWindow: window('2026-11-20') }),
    plot({ id: 'c', name: 'Tegal Lor', memberName: null, areaHa: 0.4,
      commodityIds: [], nextWindow: null, expectedTonnes: null, progress: null }),
  ]

  it('returns everything for the default filter', () => {
    expect(filterPlots(plots, DEFAULT_FILTER, today)).toHaveLength(3)
  })

  it('searches the farmer name as well as the plot name', () => {
    expect(filterPlots(plots, { ...DEFAULT_FILTER, query: 'ujang' }, today).map(p => p.id))
      .toEqual(['a'])
    expect(filterPlots(plots, { ...DEFAULT_FILTER, query: 'wortel' }, today).map(p => p.id))
      .toEqual(['b'])
  })

  it('ignores case', () => {
    expect(filterPlots(plots, { ...DEFAULT_FILTER, query: 'KIDUL' }, today)).toHaveLength(1)
  })

  it('survives a plot with no farmer recorded', () => {
    expect(filterPlots(plots, { ...DEFAULT_FILTER, query: 'lor' }, today).map(p => p.id))
      .toEqual(['c'])
  })

  it('keeps a plot growing ANY of the chosen commodities', () => {
    expect(filterPlots(plots, { ...DEFAULT_FILTER, commodityIds: ['padi', 'wortel'] }, today)
      .map(p => p.id)).toEqual(['a', 'b'])
  })

  // A plot with nothing growing has no harvest, so it cannot fall inside a
  // harvest window. It is registered land, not a coming harvest.
  it('drops plots with no window once a horizon is set', () => {
    expect(filterPlots(plots, { ...DEFAULT_FILTER, horizon: '30' }, today).map(p => p.id))
      .toEqual(['a'])
  })

  it('widens with the horizon', () => {
    expect(filterPlots(plots, { ...DEFAULT_FILTER, horizon: '90' }, today).map(p => p.id))
      .toEqual(['a', 'b'])
  })

  it('sorts by name, area or harvest', () => {
    const ids = (sort: 'name' | 'area' | 'harvest') =>
      filterPlots(plots, { ...DEFAULT_FILTER, sort }, today).map(p => p.id)
    expect(ids('name')).toEqual(['b', 'a', 'c'])
    expect(ids('area')).toEqual(['b', 'a', 'c'])
    expect(ids('harvest')).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate its input', () => {
    const before = plots.map(p => p.id)
    filterPlots(plots, { ...DEFAULT_FILTER, sort: 'name' }, today)
    expect(plots.map(p => p.id)).toEqual(before)
  })
})

// MT I is sown in October and runs to March; MT II is sown in April and runs
// to September. Same seasons the registration form offers as shortcuts.
describe('seasonEnd', () => {
  it('ends MT II in September', () => {
    expect(seasonEnd(new Date('2026-05-01T00:00:00Z')).toISOString().slice(0, 10))
      .toBe('2026-09-30')
  })

  it('ends MT I in March, the following year when sown late in this one', () => {
    expect(seasonEnd(new Date('2026-11-01T00:00:00Z')).toISOString().slice(0, 10))
      .toBe('2027-03-31')
    expect(seasonEnd(new Date('2026-02-01T00:00:00Z')).toISOString().slice(0, 10))
      .toBe('2026-03-31')
  })
})

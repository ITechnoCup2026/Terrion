import { describe, expect, it } from 'vitest'

import { utcDate } from '@/lib/agronomy/dates'
import type { BlockProjection, HarvestWindow } from '@/lib/agronomy/types'

import { summarisePlots, type PlotRow } from './summary'

const plot = (id: string, name: string, areaHa: number, memberName: string | null): PlotRow =>
  ({ id, name, areaHa, memberName })

const projection = (
  blockId: string, plotId: string, start: string, end: string, tonnes: number,
): BlockProjection => ({
  blockId, plotId, commodityId: 'c1',
  window: { start: utcDate(start), end: utcDate(end) },
  expectedTonnes: tonnes,
})

const window = (start: string, end: string): HarvestWindow => ({
  start: utcDate(start), end: utcDate(end), confidence: 0.8,
  gddAccumulated: 100, gddRequired: 200, stage: 2,
  basis: 'observed', plausibility: 'ok', cumulativeGdd: [],
})

describe('summarisePlots', () => {
  it('totals area and tonnage per plot', () => {
    const [summary] = summarisePlots({
      plots: [plot('p1', 'Sawah Utara', 1.4, 'Pak Asep')],
      projections: [
        projection('b1', 'p1', '2026-09-07', '2026-09-13', 3),
        projection('b2', 'p1', '2026-09-14', '2026-09-20', 2),
      ],
      windows: new Map([['b1', window('2026-09-07', '2026-09-13')]]),
    })

    expect(summary.name).toBe('Sawah Utara')
    expect(summary.memberName).toBe('Pak Asep')
    expect(summary.blockCount).toBe(2)
    expect(summary.expectedTonnes).toBeCloseTo(5, 5)
  })

  // The list answers "what needs attention first", so the soonest window wins.
  it('takes the earliest window when a plot has several blocks', () => {
    const [summary] = summarisePlots({
      plots: [plot('p1', 'Sawah', 1, null)],
      projections: [
        projection('late', 'p1', '2026-10-05', '2026-10-11', 1),
        projection('early', 'p1', '2026-09-07', '2026-09-13', 1),
      ],
      windows: new Map([
        ['late', window('2026-10-05', '2026-10-11')],
        ['early', window('2026-09-07', '2026-09-13')],
      ]),
    })

    expect(summary.nextWindow?.start).toEqual(utcDate('2026-09-07'))
  })

  it('sorts plots by their soonest harvest', () => {
    const summaries = summarisePlots({
      plots: [plot('p1', 'Nanti', 1, null), plot('p2', 'Duluan', 1, null)],
      projections: [
        projection('b1', 'p1', '2026-10-05', '2026-10-11', 1),
        projection('b2', 'p2', '2026-09-07', '2026-09-13', 1),
      ],
      windows: new Map([
        ['b1', window('2026-10-05', '2026-10-11')],
        ['b2', window('2026-09-07', '2026-09-13')],
      ]),
    })

    expect(summaries.map(s => s.name)).toEqual(['Duluan', 'Nanti'])
  })

  // A plot with no projection is not a plot with a harvest of zero. It still
  // has to appear -- it is registered land -- but it cannot claim a date.
  it('keeps unprojected plots, with a null window, at the end', () => {
    const summaries = summarisePlots({
      plots: [plot('p1', 'Belum ditanam', 1, null), plot('p2', 'Sudah', 1, null)],
      projections: [projection('b1', 'p2', '2026-09-07', '2026-09-13', 4)],
      windows: new Map([['b1', window('2026-09-07', '2026-09-13')]]),
    })

    expect(summaries.map(s => s.name)).toEqual(['Sudah', 'Belum ditanam'])
    expect(summaries[1].nextWindow).toBeNull()
    expect(summaries[1].blockCount).toBe(0)
    expect(summaries[1].expectedTonnes).toBeNull()
  })

  // A window the model could not produce must not silently become a date.
  it('reports a null window when the projection has no window row', () => {
    const [summary] = summarisePlots({
      plots: [plot('p1', 'Sawah', 1, null)],
      projections: [projection('b1', 'p1', '2026-09-07', '2026-09-13', 4)],
      windows: new Map(),
    })

    expect(summary.nextWindow).toBeNull()
    expect(summary.expectedTonnes).toBeCloseTo(4, 5)
  })
})

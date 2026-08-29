import { describe, it, expect } from 'vitest'
import { upcomingHarvests, upcomingTonnes } from './upcoming'
import type { BlockProjection } from '@/lib/agronomy/types'

const projection = (
  blockId: string, plotId: string, start: string, end: string, tonnes = 1,
): BlockProjection => ({
  blockId, plotId, commodityId: 'padi',
  window: { start: new Date(start), end: new Date(end) },
  expectedTonnes: tonnes,
})

const plots = new Map([
  ['p1', { name: 'Sawah Kidul', memberName: 'Pak Ujang' }],
  ['p2', { name: 'Kebun Cabe', memberName: null }],
])
const commodities = new Map([['padi', 'Padi']])

const from = new Date('2026-09-01T00:00:00Z')
const to = new Date('2026-09-08T00:00:00Z')

const run = (projections: BlockProjection[], limit?: number) =>
  upcomingHarvests({ projections, from, to, plots, commodities, limit })

describe('upcomingHarvests', () => {
  it('keeps a window that starts inside the period', () => {
    expect(run([projection('b', 'p1', '2026-09-03', '2026-09-06')])).toHaveLength(1)
  })

  // A window that opened last week and closes on Tuesday is very much this
  // week's problem; testing the start alone would drop it.
  it('keeps a window that opened before the period and is still open', () => {
    expect(run([projection('b', 'p1', '2026-08-28', '2026-09-02')])).toHaveLength(1)
  })

  it('keeps a window that starts inside and closes after', () => {
    expect(run([projection('b', 'p1', '2026-09-07', '2026-09-20')])).toHaveLength(1)
  })

  it('drops a window that closed before the period', () => {
    expect(run([projection('b', 'p1', '2026-08-01', '2026-08-20')])).toHaveLength(0)
  })

  it('drops a window that opens after the period', () => {
    expect(run([projection('b', 'p1', '2026-10-01', '2026-10-10')])).toHaveLength(0)
  })

  // A plot the query did not return is a plot the reader may not see. It must
  // not appear as a nameless row.
  it('drops a projection whose plot is not in the map', () => {
    expect(run([projection('b', 'ghost', '2026-09-03', '2026-09-06')])).toHaveLength(0)
  })

  it('names the plot, the farmer and the commodity', () => {
    const [row] = run([projection('b', 'p1', '2026-09-03', '2026-09-06', 2.5)])
    expect(row).toMatchObject({
      plotName: 'Sawah Kidul', memberName: 'Pak Ujang', commodityName: 'Padi', tonnes: 2.5,
    })
  })

  it('survives a plot with no farmer recorded', () => {
    expect(run([projection('b', 'p2', '2026-09-03', '2026-09-06')])[0].memberName).toBeNull()
  })

  it('sorts soonest first', () => {
    const rows = run([
      projection('late', 'p1', '2026-09-06', '2026-09-07'),
      projection('early', 'p1', '2026-09-02', '2026-09-03'),
    ])
    expect(rows.map(r => r.blockId)).toEqual(['early', 'late'])
  })

  it('applies a limit', () => {
    const rows = run([
      projection('a', 'p1', '2026-09-02', '2026-09-03'),
      projection('b', 'p1', '2026-09-03', '2026-09-04'),
      projection('c', 'p1', '2026-09-04', '2026-09-05'),
    ], 2)
    expect(rows.map(r => r.blockId)).toEqual(['a', 'b'])
  })
})

describe('upcomingTonnes', () => {
  it('adds the rows it is given', () => {
    expect(upcomingTonnes(run([
      projection('a', 'p1', '2026-09-02', '2026-09-03', 1.5),
      projection('b', 'p1', '2026-09-03', '2026-09-04', 2),
    ]))).toBe(3.5)
  })

  it('is zero for nothing due', () => {
    expect(upcomingTonnes([])).toBe(0)
  })
})

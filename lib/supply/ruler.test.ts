import { describe, expect, it } from 'vitest'

import { utcDate } from '@/lib/agronomy/dates'
import type { Listing } from '@/lib/catalog/listings'
import { monthTicks, RULER_MAX_ROWS, supplyRows } from '@/lib/supply/ruler'

/** A listing carrying only the fields the ruler reads. */
function listing(commodityName: string, start: string, end: string, tonnes: number): Listing {
  return {
    id: `${commodityName}-${start}`,
    cooperativeId: 'c1',
    cooperativeName: 'KT Uji',
    province: 'Jawa Barat',
    district: 'Karawang',
    village: 'Sukamaju',
    commodityId: commodityName,
    commodityName,
    varietyName: null,
    isoWeek: '2026-W01',
    weekStart: utcDate(start),
    weekEnd: utcDate(end),
    tonnes,
    blockIds: [],
    basis: 'observed',
  }
}

// A Monday, so the twelve weeks line up with the dates below.
const FROM = utcDate('2026-09-07')

describe('supplyRows', () => {
  it('merges adjacent weeks of one commodity into a single run', () => {
    const rows = supplyRows(
      [
        listing('Padi', '2026-09-07', '2026-09-13', 10),
        listing('Padi', '2026-09-14', '2026-09-20', 12),
      ],
      FROM,
    )

    expect(rows).toEqual([{ commodity: 'Padi', tonnes: 22, runs: [[0, 2]] }])
  })

  it('keeps a gap between two harvests as two runs', () => {
    const rows = supplyRows(
      [
        listing('Cabai', '2026-09-07', '2026-09-13', 3),
        listing('Cabai', '2026-10-05', '2026-10-11', 4),
      ],
      FROM,
    )

    expect(rows[0].runs).toEqual([[0, 1], [4, 1]])
  })

  it('orders rows by tonnage and caps how many are shown', () => {
    const many = Array.from({ length: RULER_MAX_ROWS + 3 }, (_, i) =>
      listing(`Komoditas ${i}`, '2026-09-07', '2026-09-13', i))

    const rows = supplyRows(many, FROM)

    expect(rows).toHaveLength(RULER_MAX_ROWS)
    expect(rows[0].commodity).toBe(`Komoditas ${RULER_MAX_ROWS + 2}`)
    expect(rows.map(r => r.tonnes)).toEqual([...rows.map(r => r.tonnes)].sort((a, b) => b - a))
  })

  it('drops a harvest that falls outside the twelve-week horizon', () => {
    const rows = supplyRows([listing('Kopi', '2027-03-01', '2027-03-07', 40)], FROM)

    expect(rows).toEqual([])
  })

  it('counts a window ending on a week boundary in the week it was harvested', () => {
    // 14 Sep is the start of week index 1, so a window closing on 13 Sep must
    // stay in week 0 and not bleed into the week after it.
    const rows = supplyRows([listing('Padi', '2026-09-09', '2026-09-13', 5)], FROM)

    expect(rows[0].runs).toEqual([[0, 1]])
  })
})

describe('monthTicks', () => {
  it('labels each month boundary in the horizon', () => {
    expect(monthTicks(FROM).map(t => t.label)).toEqual(['Sep', 'Okt', 'Nov'])
  })

  it('drops an opening partial month too narrow to hold its own label', () => {
    // 28 Sep leaves three days before 1 Oct: both labels cannot be read, so
    // the boundary replaces the partial month rather than crowding it.
    const ticks = monthTicks(utcDate('2026-09-28'))

    expect(ticks.map(t => t.label)).toEqual(['Okt', 'Nov', 'Des'])
    expect(ticks[0].left).toBeCloseTo((3 / 84) * 100, 5)
  })

  it('starts at the left edge when the horizon opens on the first', () => {
    const ticks = monthTicks(utcDate('2026-10-01'))

    expect(ticks[0]).toEqual({ label: 'Okt', left: 0 })
  })
})

import { describe, it, expect } from 'vitest'
import { formatHarvestRange, MONTHS_ID } from './format'
import { utcDate } from '@/lib/agronomy/dates'

const range = (a: string, b: string) => formatHarvestRange(utcDate(a), utcDate(b))

describe('formatHarvestRange', () => {
  it('collapses a range inside one month', () => {
    expect(range('2026-10-10', '2026-10-17')).toBe('10–17 Okt')
  })

  it('names both months when the range crosses one', () => {
    expect(range('2026-09-28', '2026-10-04')).toBe('28 Sep – 4 Okt')
  })

  it('adds years when the range crosses new year', () => {
    // Without the year this reads as a range running backwards.
    expect(range('2026-12-28', '2027-01-04')).toBe('28 Des 2026 – 4 Jan 2027')
  })

  it('renders a single day when both edges agree', () => {
    expect(range('2026-10-10', '2026-10-10')).toBe('10 Okt')
  })

  it('reads dates in UTC, not the viewer timezone', () => {
    // These are midnight UTC. Formatting locally would shift them a day west
    // of Greenwich and show 9 Okt to a farmer in WIB.
    expect(range('2026-10-09', '2026-10-09')).toBe('9 Okt')
  })

  it('uses Indonesian month abbreviations', () => {
    expect(MONTHS_ID).toEqual(
      ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'])
  })
})

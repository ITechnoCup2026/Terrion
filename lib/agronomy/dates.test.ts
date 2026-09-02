import { describe, it, expect } from 'vitest'
import { utcDate, addDays, daysBetween, dayOfYear, isoWeekKey, isoWeekStart, toISODate } from './dates'

describe('date helpers', () => {
  it('builds UTC dates from ISO strings without local-time drift', () => {
    expect(toISODate(utcDate('2026-10-14'))).toBe('2026-10-14')
  })
  it('takes the date part of a full timestamp', () => {
    // The API returns responded_at/created_at as full ISO timestamps. Splitting
    // one on '-' used to yield a NaN day, and the request inbox rendered its
    // answered-on column as "NaN undefined NaN".
    expect(toISODate(utcDate('2026-10-14T13:44:39.123Z'))).toBe('2026-10-14')
    expect(Number.isNaN(utcDate('2026-10-14T13:44:39.123Z').getTime())).toBe(false)
  })
  it('adds days across a month boundary', () => {
    expect(toISODate(addDays(utcDate('2026-10-30'), 5))).toBe('2026-11-04')
  })
  it('counts days between dates', () => {
    expect(daysBetween(utcDate('2026-10-10'), utcDate('2026-10-17'))).toBe(7)
  })
  it('computes day of year', () => {
    expect(dayOfYear(utcDate('2026-01-01'))).toBe(1)
    expect(dayOfYear(utcDate('2026-12-31'))).toBe(365)
  })
  it('computes ISO week keys', () => {
    expect(isoWeekKey(utcDate('2026-01-01'))).toBe('2026-W01')
    expect(isoWeekKey(utcDate('2026-10-14'))).toBe('2026-W42')
  })
  it('keeps early January in the previous ISO year when the week started there', () => {
    // 2027-01-01 is a Friday, so its ISO week began Mon 2026-12-28 and belongs to
    // ISO year 2026. Returning '2027-W01' here would join weekly prices to the
    // wrong year.
    expect(isoWeekKey(utcDate('2027-01-01'))).toBe('2026-W53')
  })
  it('returns Monday as the ISO week start', () => {
    expect(toISODate(isoWeekStart(utcDate('2026-10-14')))).toBe('2026-10-12')
  })
})

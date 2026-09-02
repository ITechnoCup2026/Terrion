// UTC-only calendar arithmetic. Everything downstream assumes midnight UTC,
// so local timezones can never shift a day's weather onto the wrong date.

const MS_DAY = 86_400_000

/**
 * Parse an ISO date into midnight UTC on that day.
 *
 * Takes the date part of anything ISO-8601, so a bare 'YYYY-MM-DD' and a full
 * '2026-09-02T13:44:39.123Z' timestamp both work. That tolerance is not
 * cosmetic: splitting a full timestamp on '-' yields ['2026','09','02T13:44…'],
 * Number() of the last part is NaN, and Date.UTC with a NaN day produces an
 * Invalid Date that formats as "NaN undefined NaN" -- which is exactly what
 * the cooperative's request inbox printed in its answered-on column, because
 * that one call site passed `responded_at` straight through while every other
 * caller happened to .slice(0, 10) first.
 *
 * Discarding the time is correct rather than lossy here: this module is UTC-only
 * by design so that a local timezone can never shift a day's weather onto the
 * wrong date, and every date downstream is midnight UTC.
 */
export function utcDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

// Format a date back to 'YYYY-MM-DD'.
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Move a date forward (or back, with a negative n) by whole days.
export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_DAY)
}

// Whole days from a to b; negative when b comes first.
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_DAY)
}

// Position within the year, 1 on January 1st — the key into climate normals.
export function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1)
  return Math.floor((d.getTime() - start) / MS_DAY) + 1
}

// The Monday that begins this date's ISO week.
export function isoWeekStart(d: Date): Date {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = t.getUTCDay() || 7
  return addDays(t, 1 - dayNum)
}

// The 'YYYY-Www' key for this date's ISO week. The year comes from the week's
// Thursday, not the date itself, so a week spanning New Year stays in one year.
export function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dayNum)          // Thursday of this ISO week
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((t.getTime() - yearStart) / MS_DAY + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

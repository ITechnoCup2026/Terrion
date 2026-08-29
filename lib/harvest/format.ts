// Rendering rules for a harvest window, kept out of the component so they can
// be tested. Everything reads UTC: the dates are midnight UTC, and formatting
// them locally would show a farmer in WIB the previous day.

export const MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
] as const

// One date in full. Not a harvest -- a harvest is always a range, and
// formatHarvestRange is the only thing that may render one. This is for dates
// that genuinely are a single day, like when a block was planted.
export function formatDateId(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// One range, as short as it can be without becoming ambiguous.
export function formatHarvestRange(start: Date, end: Date): string {
  const d1 = start.getUTCDate(), m1 = start.getUTCMonth(), y1 = start.getUTCFullYear()
  const d2 = end.getUTCDate(), m2 = end.getUTCMonth(), y2 = end.getUTCFullYear()

  if (y1 === y2 && m1 === m2 && d1 === d2) return `${d1} ${MONTHS_ID[m1]}`
  // Across new year the months alone read as a range running backwards.
  if (y1 !== y2) return `${d1} ${MONTHS_ID[m1]} ${y1} – ${d2} ${MONTHS_ID[m2]} ${y2}`
  if (m1 === m2) return `${d1}–${d2} ${MONTHS_ID[m1]}`
  return `${d1} ${MONTHS_ID[m1]} – ${d2} ${MONTHS_ID[m2]}`
}

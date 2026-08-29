// The sentences the collision alert says out loud.
//
// These live here rather than inside the component because each one carries a
// judgement the spec is specific about: a pile-up must always name the basis
// it was judged against (spec D2), and a staggering suggestion must be
// concrete enough to act on. Both are easy to get subtly wrong in JSX and
// impossible to notice once rendered.

import { MEDIAN_MULTIPLIER } from '@/lib/agronomy/collide'
import { formatNumberId } from '@/lib/format/number'
import { MONTHS_ID_LONG } from '@/lib/format/month'

/**
 * `minggu ke-3 Oktober` — which week of its month a date falls in.
 *
 * Read in UTC: harvest windows are midnight UTC and reading them in WIB
 * shifts the day, which on the 7th/8th boundary names the wrong week.
 */
export function weekOfMonthLabel(weekStart: Date): string {
  const week = Math.floor((weekStart.getUTCDate() - 1) / 7) + 1
  return `minggu ke-${week} ${MONTHS_ID_LONG[weekStart.getUTCMonth()]}`
}

/** How many plots pile up, in which week, and roughly how much. */
export function collisionHeadline(input: {
  plotCount: number
  totalPlots: number
  weekStart: Date
  tonnes: number
}): string {
  return (
    `${input.plotCount} dari ${input.totalPlots} lahan diproyeksikan panen pada ` +
    `${weekOfMonthLabel(input.weekStart)} — sekitar ${formatNumberId(input.tonnes)} ton dalam 7 hari.`
  )
}

/**
 * What the week was judged against — never a bare "too much".
 *
 * A cooperative that set its own capacity gets that number quoted back. One
 * that did not is compared to its own typical week, so the claim stays the
 * cooperative's own history rather than an outside benchmark it never agreed to.
 */
export function collisionBasis(flagged: {
  basis: 'capacity' | 'median'
  threshold: number
  tonnes: number
}): string {
  if (flagged.basis === 'capacity') {
    return `di atas ${formatNumberId(flagged.threshold)} t/minggu yang koperasi Anda tetapkan`
  }

  // threshold is the median scaled by MEDIAN_MULTIPLIER, so recover the median
  // to express the pile-up as a multiple of an ordinary week.
  const median = flagged.threshold / MEDIAN_MULTIPLIER
  if (median <= 0) return 'di atas minggu tipikal Anda'

  return `${formatNumberId(flagged.tonnes / median)}× minggu tipikal Anda`
}

/** The smallest concrete change that relieves the pile-up, plus the fallback. */
export function staggerSentence(suggestion: {
  blockIds: string[]
  shiftDays: number
  tonnesMoved: number
}): string {
  const count = suggestion.blockIds.length
  const tonnes = formatNumberId(suggestion.tonnesMoved)

  // A negative shift is planting *earlier*; "sebesar -7 hari" reads as an error.
  const move =
    suggestion.shiftDays >= 0
      ? `Geser tanam ${count} blok sebesar +${suggestion.shiftDays} hari`
      : `Majukan tanam ${count} blok sebesar ${Math.abs(suggestion.shiftDays)} hari`

  return `${move} musim depan, atau siapkan penyimpanan untuk ${tonnes} ton.`
}

// Rupiah, short enough to fit a stat tile.
//
// Amounts here span six orders of magnitude: a price difference is tens of
// rupiah per kg, a season's bulk-buying saving is millions. Printing both in
// full puts "Rp 4.250.000" into a ~150 px tile on a 360 px phone, which wraps
// or clips. Compaction starts at a million so ordinary per-kg figures stay
// exact and only the aggregates get abbreviated.

import { formatNumberId } from './number'

const JUTA = 1_000_000
const MILIAR = 1_000_000_000

/** `Rp 150`, `Rp 12.500`, `Rp 4,3 jt`, `Rp 1,2 M`. Negatives keep the minus
 *  outside the currency mark, as `-Rp 150`. */
export function formatRupiah(value: number): string {
  if (!Number.isFinite(value)) return '—'

  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)

  if (abs >= MILIAR) return `${sign}Rp ${formatNumberId(abs / MILIAR)} M`
  if (abs >= JUTA) return `${sign}Rp ${formatNumberId(abs / JUTA)} jt`

  // Below a million, state it exactly. Nobody quotes rupiah fractions.
  return `${sign}Rp ${formatNumberId(Math.round(abs), 0)}`
}

/**
 * The same, but a positive amount carries an explicit `+`.
 *
 * For a figure that is a difference — what the cooperative got *against* the
 * reference price — an unsigned "Rp 150" does not say which side of the
 * reference it landed on.
 */
export function formatRupiahSigned(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return value > 0 ? `+${formatRupiah(value)}` : formatRupiah(value)
}

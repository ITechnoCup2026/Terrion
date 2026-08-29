// Indonesian number rendering, in one place. Indonesian swaps the separators
// a JS default would use — 4.200,5 not 4,200.5 — and every dashboard figure,
// stat tile and alert sentence needs the same treatment. Hand-rolling it per
// component is how "4.2 t" and "4,2 t" end up on the same screen.

const CACHE = new Map<number, Intl.NumberFormat>()

// One formatter per precision, built once — constructing Intl.NumberFormat is
// expensive enough to matter inside a table of 47 rows.
function formatterFor(maxDecimals: number): Intl.NumberFormat {
  const cached = CACHE.get(maxDecimals)
  if (cached) return cached
  const made = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  })
  CACHE.set(maxDecimals, made)
  return made
}

/**
 * A number as Indonesian reads it: `4.200,5`.
 *
 * Trailing zero decimals are dropped, so a whole tonnage reads `112` rather
 * than `112,0`. Zero formats as `0` — deciding that a figure is *absent*
 * rather than zero belongs to the caller (see `<StatTile>`), never here.
 */
export function formatNumberId(value: number, maxDecimals = 1): string {
  if (!Number.isFinite(value)) return '—'
  return formatterFor(maxDecimals).format(value)
}

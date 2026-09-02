/**
 * How a fertiliser is written on screen.
 *
 * The rates table stores an input as a slug — `urea`, `npk`, `sp36`, `kcl` —
 * and every panel that showed one was passing that straight into a CSS
 * `capitalize`, which renders "Npk", "Sp36" and "Kcl". Those are not words:
 * they are a compound name and two chemical formulae, and a cooperative
 * reading "Kcl" beside "Urea" is reading a typo on a page whose whole claim is
 * that the figures came from somewhere official.
 *
 * Only display goes through here. The RDKK export writes the government form's
 * own column headings from the raw slug, and must keep doing so.
 */

const WRITTEN: Record<string, string> = {
  npk: 'NPK',
  sp36: 'SP-36',
  'sp-36': 'SP-36',
  kcl: 'KCl',
  za: 'ZA',
  tsp: 'TSP',
  dap: 'DAP',
  zk: 'ZK',
}

/**
 * An input item as it should be typeset. Anything not a known formula is
 * returned untouched, for a `capitalize` upstream to handle — "urea" and
 * "pupuk organik" are ordinary words and should stay that way.
 */
export function inputItemLabel(item: string): string {
  return WRITTEN[item.toLowerCase().trim()] ?? item
}

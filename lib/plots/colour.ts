/**
 * One colour per commodity, indexed by `commodity.sprite_row`.
 *
 * The same seven colours the canvas outlines blocks with. They live here, not
 * in a page, because the plot list and the farm now both use them and a crop
 * that is olive on one screen and red on the other is worse than no colour at
 * all.
 *
 * They are earth tones on purpose: these sit against soil and crop sprites,
 * where a saturated UI palette reads as a sticker.
 */
export const BLOCK_COLOURS = [
  '#52513d', '#525726', '#ab5124', '#7a6a3a', '#8a4b2f', '#6b5b95', '#a33d5e',
] as const

/** The colour for a commodity's sprite row, wrapping if the table grows. */
export function commodityColour(spriteRow: number): string {
  return BLOCK_COLOURS[spriteRow % BLOCK_COLOURS.length]
}

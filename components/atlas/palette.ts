/**
 * The Atlas's own colours.
 *
 * Fixed hex rather than palette tokens, and deliberately: this is the one
 * surface in the product where colour is the data. A choropleth needs a ramp
 * whose steps are evenly spaced to the eye, and the interface palette is not
 * built for that -- it has the two greens the UI needs and nothing between
 * them. The endpoints are the palette's own (--terrion-green-50 and
 * --terrion-green-700) so the map still belongs to the product; the three
 * steps between are interpolated for even perceptual spacing.
 *
 * The map used to be near-black, with region shades chosen by hashing the
 * region's NAME into one of six lightnesses. That is texture standing in for
 * information: six shades that look like data and mean nothing, on a ground
 * where the one shade that did mean something had almost no contrast left to
 * say it with. Paper gives the whole range back.
 */

/** Sea, land, and the marks drawn on top of them. */
export const MAP = {
  /** Sea. Deep enough that the coastline is a shape and not just a hairline;
   *  at a lighter value the archipelago read as an outline drawing on paper. */
  water: '#dfe6e1',
  /** Land with no registered cooperative. Paper, and a hairline to shape it. */
  land: '#ffffff',
  landStroke: '#d3ddd7',
  /** A region that can be drilled into, under the pointer. */
  hoverStroke: '#47574e',
  /** The region currently being looked at. */
  activeStroke: '#0f1c16',

  /**
   * A cooperative's position. Ink with a paper halo, so it is legible on white
   * sea, white land and the deepest green alike. It used to be harvest gold,
   * which in this product means "at or over a limit" -- a cooperative existing
   * somewhere is not a warning, and spending the warning colour on identity is
   * what leaves nothing left to warn with.
   */
  pin: '#0f1c16',
  pinHalo: '#ffffff',
} as const

/**
 * The supply ramp, indexed by `supplyStep`.
 *
 * Step 0 is not "a little" -- it is a cooperative registered here with nothing
 * projected, which is a different claim from a small harvest and is drawn as
 * one. Steps 1 to 4 are quartiles of the heaviest region on the map.
 */
export const SUPPLY_RAMP = [
  '#eef6f1', // 0 — registered, nothing projected
  '#cfe8da', // 1
  '#96ceac', // 2
  '#4aa870', // 3
  '#1a5f3c', // 4
] as const

/** What the legend calls each step. */
export const SUPPLY_LEGEND = [
  'Terdaftar, belum ada proyeksi',
  'Paling sedikit',
  '',
  '',
  'Paling banyak',
] as const

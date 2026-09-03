/**
 * Which rim picture each corner of a tile needs, so ground types meet organically.
 *
 * This is the autotiling engine lib/terrain/motifs.ts used to say it deliberately
 * did without. The objection there was sound about the method it had in mind: a
 * 47-variant lookup resolved per cell at draw time is both expensive and easy to
 * get subtly wrong. This resolves each of a tile's four CORNERS independently
 * instead, from three booleans, which collapses the whole problem to five cases
 * and makes it exhaustively testable -- autotile.test.ts walks all 256 neighbour
 * arrangements.
 *
 * The pieces come from the tile pack's own blob sets, which are drawn on
 * transparent backgrounds. That is what lets one set of thirteen pictures serve
 * every boundary: grass over soil, grass over sand and grass over dark grass are
 * the same rim composited onto different ground.
 *
 * Nothing here knows about canvases, images or plots. It answers one question --
 * given what surrounds this cell, which quadrants go where -- and lib/canvas
 * does the drawing.
 */

/**
 * The thirteen pictures in one material's transition set, in the order
 * scripts/build-sprites.ts writes them into transitions.png.
 *
 * A rim is a straight edge; a convex corner is an outside corner, where the
 * material turns away from itself; a concave corner is an inside corner, where
 * it wraps around a notch of something else.
 */
export const PIECE = {
  interior: 0,
  rimN: 1,
  rimS: 2,
  rimW: 3,
  rimE: 4,
  convexNW: 5,
  convexNE: 6,
  convexSW: 7,
  convexSE: 8,
  concaveNW: 9,
  concaveNE: 10,
  concaveSW: 11,
  concaveSE: 12,
} as const

export const PIECE_COUNT = 13

export type CornerKey = 'NW' | 'NE' | 'SW' | 'SE'

/**
 * One corner of a tile: which quadrant of the tile it occupies, and which two
 * neighbours it sits between.
 *
 * `qx`/`qy` are quadrant coordinates, 0 or 1, so a renderer multiplies them by
 * half a tile. `dc`/`dr` point at the diagonal neighbour; the two straight
 * neighbours are that diagonal split into its column and row halves.
 */
export type Corner = {
  key: CornerKey
  qx: 0 | 1
  qy: 0 | 1
  /** Column offset of the diagonal neighbour: -1 west, +1 east. */
  dc: -1 | 1
  /** Row offset of the diagonal neighbour: -1 north, +1 south. */
  dr: -1 | 1
}

export const CORNERS: readonly Corner[] = [
  { key: 'NW', qx: 0, qy: 0, dc: -1, dr: -1 },
  { key: 'NE', qx: 1, qy: 0, dc: 1, dr: -1 },
  { key: 'SW', qx: 0, qy: 1, dc: -1, dr: 1 },
  { key: 'SE', qx: 1, qy: 1, dc: 1, dr: 1 },
] as const

const CONVEX: Record<CornerKey, number> = {
  NW: PIECE.convexNW,
  NE: PIECE.convexNE,
  SW: PIECE.convexSW,
  SE: PIECE.convexSE,
}

const CONCAVE: Record<CornerKey, number> = {
  NW: PIECE.concaveNW,
  NE: PIECE.concaveNE,
  SW: PIECE.concaveSW,
  SE: PIECE.concaveSE,
}

// The straight rim that covers a missing neighbour, by which way that neighbour lay.
const RIM_ROW: Record<-1 | 1, number> = { [-1]: PIECE.rimN, 1: PIECE.rimS }
const RIM_COL: Record<-1 | 1, number> = { [-1]: PIECE.rimW, 1: PIECE.rimE }

/**
 * The picture one corner needs, from its three neighbours.
 *
 * `vertical` and `horizontal` are the two straight neighbours the corner sits
 * between; `diagonal` is the one touching its point. All three are true when
 * that neighbour is the same material or higher.
 *
 * Reading the five cases in order: with neither straight neighbour the material
 * ends here and turns a corner; with one of them the material runs on in that
 * direction and needs a straight edge across the other; with both present but
 * the diagonal missing there is a notch to wrap around; and with all three the
 * corner is buried and needs no rim at all.
 */
export function cornerPiece(
  corner: Corner,
  vertical: boolean,
  horizontal: boolean,
  diagonal: boolean,
): number {
  if (!vertical && !horizontal) return CONVEX[corner.key]
  if (!vertical) return RIM_ROW[corner.dr]
  if (!horizontal) return RIM_COL[corner.dc]
  if (!diagonal) return CONCAVE[corner.key]
  return PIECE.interior
}

/** One quadrant to stamp: which picture, and which quarter of the tile it fills. */
export type Quadrant = {
  piece: number
  qx: 0 | 1
  qy: 0 | 1
}

/**
 * Every quadrant a cell needs, or null when it needs none.
 *
 * `present(dc, dr)` answers whether the neighbour at that offset is the same
 * material or higher. Null comes back when all four corners are interior, which
 * is the common case well inside a patch: those cells keep whatever ground tile
 * was already painted there, so tufts and pebbles survive and only boundary
 * cells pay for an overlay.
 */
export function rimQuadrants(
  present: (dc: number, dr: number) => boolean,
): Quadrant[] | null {
  const quadrants: Quadrant[] = []
  let anyRim = false

  for (const corner of CORNERS) {
    const piece = cornerPiece(
      corner,
      present(0, corner.dr),
      present(corner.dc, 0),
      present(corner.dc, corner.dr),
    )
    if (piece !== PIECE.interior) anyRim = true
    quadrants.push({ piece, qx: corner.qx, qy: corner.qy })
  }

  return anyRim ? quadrants : null
}

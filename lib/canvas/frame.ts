import { MAX_SCALE, MIN_SCALE, type View } from './view'

/**
 * How much world to draw, and where to point the camera at it.
 *
 * The farm used to be a fixed picture — plot plus three tiles of scenery —
 * scaled to fit whatever window it was in, and centred. Everything left over
 * was page background, so on a wide screen the farm sat as a square of
 * landscape in a field of white. A game does not do that: the world runs to
 * every edge of the screen and the camera sits inside it.
 *
 * So the two decisions are separated. The CAMERA frames the field: the plot
 * plus a fixed margin of scenery, which is what guarantees the fence is always
 * fully visible and the same size on the same screen. The WORLD is then made
 * as big as it needs to be to cover the viewport at that camera — however wide
 * the window, there is scenery under it.
 *
 * Pure, so the sizing rules are testable without a canvas.
 */

/** Scenery kept between the fence and the edge of the frame, in tiles.
 *  Three on a desktop, two below the mobile breakpoint: a border measured in
 *  tiles rather than pixels does not eat a third of a 360px phone. */
export const FRAME_TILES_DESKTOP = 3
export const FRAME_TILES_MOBILE = 2

/** A ceiling on the generated world, so a huge window cannot ask for a
 *  terrain canvas too big to rasterise. 48 tiles of border on a 20-tile plot
 *  is a 116-tile picture — 3712px at 32px tiles, and past anything a farm
 *  needs. */
const MAX_BORDER = 48

export type Frame = {
  /** Tiles of scenery to generate on every side of the plot. */
  border: number
  /** The camera, in the terrain's own coordinates. */
  view: View
}

/**
 * Frames a plot in a viewport.
 *
 * The scale floors onto a notch rather than rounding: rounding up gives a
 * camera that crops the field it is meant to frame.
 */
export function frameFarm(input: {
  plotCols: number
  plotRows: number
  cellPx: number
  width: number
  height: number
  /** Zoom granularity — see scaleStep. */
  step?: number
  /** Tiles of scenery the camera keeps in shot around the fence. */
  margin?: number
}): Frame {
  const { plotCols, plotRows, cellPx, width, height } = input
  const step = input.step ?? 1
  const margin = input.margin ?? FRAME_TILES_DESKTOP

  // 1. The camera frames the field plus its margin, and nothing else. What the
  //    world happens to contain beyond that does not change how big the fence
  //    is drawn — which is why two plots of the same size look the same size.
  const framedCols = plotCols + margin * 2
  const framedRows = plotRows + margin * 2
  const raw = Math.min(width / (framedCols * cellPx), height / (framedRows * cellPx))
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.floor(raw / step) * step))

  // 2. The world is then whatever covers the viewport at that camera. One tile
  //    of slack, so a fractional viewport never leaves a bare strip at an edge.
  const viewCols = Math.ceil(width / (cellPx * scale)) + 1
  const viewRows = Math.ceil(height / (cellPx * scale)) + 1
  const border = Math.min(MAX_BORDER, Math.max(
    margin,
    Math.ceil((viewCols - plotCols) / 2),
    Math.ceil((viewRows - plotRows) / 2),
  ))

  // 3. Centre the PLOT, not the world. The world is deliberately bigger than
  //    the screen, so centring it would push the field off-centre by however
  //    much scenery happened to be generated.
  const plotCentreX = (border + plotCols / 2) * cellPx
  const plotCentreY = (border + plotRows / 2) * cellPx

  return {
    border,
    view: {
      scale,
      offsetX: width / 2 - plotCentreX * scale,
      offsetY: height / 2 - plotCentreY * scale,
    },
  }
}

// The camera looking at the tile grid. Tiles never move; this does.
// scale = how big to draw, offsetX/Y = how far the grid is pushed across the canvas.
export type View = { scale: number; offsetX: number; offsetY: number }

export const MIN_SCALE = 1
export const MAX_SCALE = 6

/** One notch of the wheel. A whole step, so zooming does not feel like wading. */
export const WHEEL_STEP = 1

/**
 * How finely zoom is allowed to land, for a given device pixel ratio.
 *
 * Pixel art shimmers at a scale that does not map source pixels onto whole
 * device pixels, so zoom snaps rather than running free. How coarse that snap
 * has to be depends on the screen:
 *
 *   dpr 1    integers only. 1.5x of a 32px sprite puts each source pixel across
 *            one and a half physical pixels, and the plants crawl.
 *   dpr >= 2 halves are safe -- 1.5 x 2 = 3 whole device pixels -- and they
 *            matter, because integers alone are why the farm was drawn at 1x
 *            in the middle of an empty screen. A 16x14 grid at 32px is 512x448;
 *            in a 1500x900 viewport the largest integer that fits is 2, but 2.5
 *            fits too and covers 56% more of the screen.
 */
export function scaleStep(devicePixelRatio: number): number {
  return devicePixelRatio >= 2 ? 0.5 : 1
}

/** Rounds a scale onto the nearest allowed notch, inside the bounds. */
export function snapScale(scale: number, step: number = 1): number {
  const snapped = Math.round(scale / step) * step
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, snapped))
}

/**
 * Scale for a two-finger pinch: how far the fingers spread, times where the
 * gesture started. Snapped, so a pinch lands on whole notches like the wheel does.
 */
export function pinchScale(
  startScale: number, startDistance: number, distance: number, step: number = 1,
): number {
  if (startDistance <= 0) return snapScale(startScale, step)
  return snapScale(startScale * (distance / startDistance), step)
}

/**
 * The opening shot: the largest camera that still shows the whole grid, centred.
 *
 * Floors onto a notch rather than rounding. Rounding up gives a scale that
 * crops the grid it is meant to fit, and the point of this function is that
 * everything is visible before anybody touches anything.
 */
export function fitView(
  cols: number, rows: number, cellPx: number, w: number, h: number, step: number = 1,
): View {
  const raw = Math.min(w / (cols * cellPx), h / (rows * cellPx))
  // Nothing fits below 1x anyway, so the clamp lets pan take over there.
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.floor(raw / step) * step))
  return {
    scale,
    offsetX: (w - cols * cellPx * scale) / 2,
    offsetY: (h - rows * cellPx * scale) / 2,
  }
}

import { INDONESIA_BBOX, project, type Bbox } from './projection'

/**
 * Free pan and zoom for the Atlas, as arithmetic on a viewBox.
 *
 * The Atlas could only ever fly between rectangles somebody clicked. You could
 * not lean in on a coastline, and you could not drag. This is the camera that
 * lets you, kept as pure functions so the rules -- what a zoom does to the
 * point under the cursor, how far out you may go -- are testable without a DOM
 * or an animation frame.
 *
 * Everything is in the SVG's own coordinate space, which `project` defines:
 * x is longitude, y is negated latitude. There is no screen unit anywhere in
 * this file; the caller converts a pointer position into a 0..1 fraction of
 * the element and passes that.
 */

export type View = { x: number; y: number; w: number; h: number }

/** The whole archipelago, in SVG space. The camera may not leave it. */
export const WORLD: View = worldFrom(INDONESIA_BBOX)

function worldFrom(box: Bbox): View {
  const a = project([box[0], box[1]])
  const b = project([box[2], box[3]])
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  }
}

/** Closest in: about half a degree across, which is a large regency. */
export const MIN_SPAN = 0.4

export function parseView(viewBox: string): View {
  const [x, y, w, h] = viewBox.split(/\s+/).map(Number)
  return { x, y, w, h }
}

export function formatView(v: View): string {
  // Six decimals is well under a metre at this scale and keeps the attribute
  // from growing to forty characters on every animation frame.
  const r = (n: number) => Number(n.toFixed(6))
  return `${r(v.x)} ${r(v.y)} ${r(v.w)} ${r(v.h)}`
}

/**
 * How far one wheel notch zooms.
 *
 * Proportional to the delta rather than a fixed step, so a trackpad's many
 * small events and a mouse wheel's few large ones both feel like the same
 * gesture. Clamped, because a single fling event can carry a delta of several
 * hundred and would otherwise cross the whole zoom range at once.
 */
export function wheelFactor(deltaY: number): number {
  const clamped = Math.max(-100, Math.min(100, deltaY))
  return Math.exp(clamped * 0.0015)
}

/**
 * Zoom by `factor` about a point given as a fraction of the viewport.
 *
 * The point under the cursor stays under the cursor. That is the whole
 * contract, and it is the thing that makes wheel-zoom feel like moving a
 * camera rather than resizing a picture: everything else -- the offsets, the
 * clamping -- follows from holding it.
 */
export function zoomAt(view: View, factor: number, fx: number, fy: number): View {
  const maxSpan = Math.max(WORLD.w, WORLD.h)
  const w = Math.max(MIN_SPAN, Math.min(maxSpan, view.w * factor))
  // Height follows width so the aspect ratio the caller fitted is preserved;
  // deriving it independently is how a map ends up subtly stretched.
  const h = view.h * (w / view.w)

  return clampView({
    x: view.x + (view.w - w) * fx,
    y: view.y + (view.h - h) * fy,
    w,
    h,
  })
}

/** Drag: move by a fraction of the current span, so a drag covers the same
 *  screen distance whatever the zoom. */
export function panBy(view: View, fx: number, fy: number): View {
  return clampView({ ...view, x: view.x - view.w * fx, y: view.y - view.h * fy })
}

/** The span between two touches, for pinch. */
export function touchDistance(
  a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number },
): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

/**
 * Keeps the camera over the country.
 *
 * When the view is wider than the world it is CENTRED rather than pushed to an
 * edge: zoomed all the way out, a map pinned to its left margin with empty
 * space on the right looks broken, and there is no reading of "clamp" that
 * makes it right.
 */
export function clampView(view: View): View {
  const x = view.w >= WORLD.w
    ? WORLD.x + (WORLD.w - view.w) / 2
    : Math.min(Math.max(view.x, WORLD.x), WORLD.x + WORLD.w - view.w)
  const y = view.h >= WORLD.h
    ? WORLD.y + (WORLD.h - view.h) / 2
    : Math.min(Math.max(view.y, WORLD.y), WORLD.y + WORLD.h - view.h)
  return { ...view, x, y }
}

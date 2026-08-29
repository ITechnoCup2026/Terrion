/**
 * Where to put a panel that was opened by clicking a point.
 *
 * The farm canvas is one big surface with no DOM elements in it, so there is
 * nothing for a popover library to anchor to -- only the coordinates of the
 * click. This works out the rest: offset from the pointer so the panel never
 * covers the tile it is describing, flipped to the other side when it would
 * leave the viewport, and clamped when flipping is not enough either.
 *
 * Pure, and separate from the component, because the interesting cases are the
 * four corners and the two flip boundaries -- none of which are reachable by
 * clicking around in a browser with any confidence that you hit them.
 */

export type Point = { x: number; y: number }
export type Size = { width: number; height: number }
export type Viewport = { width: number; height: number }

/** Which side of the pointer the panel ended up on, for the tail to point back. */
export type Side = 'top' | 'bottom'

export type Placement = { x: number; y: number; side: Side }

export type AnchorOptions = {
  /** Space between the pointer and the panel. */
  gap?: number
  /** Closest the panel may come to the edge of the viewport. */
  margin?: number
}

const DEFAULTS = { gap: 12, margin: 8 }

// Keeps a value inside [min, max]. When the range is inverted -- a panel
// taller than the window -- min wins, so the panel's top-left stays on screen
// and it overflows downward where it can still be scrolled to.
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

/**
 * Places a panel next to a point.
 *
 * Prefers below-and-right of the pointer, which is where a cursor-anchored
 * panel is expected and where it obscures the least of what is above it.
 */
export function placeAnchored(
  point: Point,
  size: Size,
  viewport: Viewport,
  options: AnchorOptions = {},
): Placement {
  const gap = options.gap ?? DEFAULTS.gap
  const margin = options.margin ?? DEFAULTS.margin

  const maxX = viewport.width - margin - size.width
  const maxY = viewport.height - margin - size.height

  // Horizontal: right of the pointer, unless that overflows and there is
  // genuinely more room on the left.
  const right = point.x + gap
  const left = point.x - gap - size.width
  const x = right > maxX && left >= margin ? left : right

  // Vertical: the same, and this one names the side because it is the axis the
  // tail points along.
  const below = point.y + gap
  const above = point.y - gap - size.height
  const flipped = below > maxY && above >= margin
  const y = flipped ? above : below

  return {
    x: clamp(x, margin, maxX),
    y: clamp(y, margin, maxY),
    side: flipped ? 'top' : 'bottom',
  }
}

/**
 * The palette the canvas draws with, resolved from CSS once.
 *
 * A <canvas> cannot take a class, so every colour it paints has to arrive as a
 * string. The renderer used to fetch those strings itself, with
 * getComputedStyle(document.documentElement) called inside drawSelection --
 * which PlotCanvas.composite() runs on every frame of a pan or a zoom. That is
 * a forced style recalculation per frame, to re-read three values that cannot
 * change: the product has no runtime theme switch.
 *
 * So: read them once, keep them.
 *
 * The two colours this file exists to fix were --terrion-grid-line and
 * --terrion-fg, neither of which has existed since the palette rewrite. They
 * were not black, the way the dashboard's bars were, because the renderer
 * guarded them with `|| '#432b30'` -- a value from the sepia tileset palette
 * that was deleted at the same time. That is the worse failure of the two: a
 * missing colour is visible, a wrong one that somebody once chose on purpose
 * just looks like a decision. lib/theme/tokens.test.ts now rejects both.
 */

export type CanvasPalette = {
  /** Tile grid lines. Drawn on soil, so this cannot be --border. */
  grid: string
  /** The selected block's outline. */
  selection: string
  /** Block labels stamped into the base layer. */
  label: string
}

// Compiled-in last resort, used only where there is no document to ask: the
// unit tests, and any server-side call. Kept in step with globals.css by
// lib/theme/tokens.test.ts, which fails if the tokens below stop existing.
const FALLBACK: CanvasPalette = {
  grid: 'rgb(16 35 26 / 0.13)',
  selection: '#10231a',
  label: 'rgb(16 35 26 / 0.72)',
}

let cached: CanvasPalette | null = null

/** Reads one custom property off the document root, or '' if there is none. */
function token(styles: CSSStyleDeclaration, name: string): string {
  return styles.getPropertyValue(name).trim()
}

/** The canvas palette, resolved from the stylesheet on first call and reused. */
export function canvasPalette(): CanvasPalette {
  if (cached) return cached
  if (typeof document === 'undefined') return FALLBACK

  const styles = getComputedStyle(document.documentElement)
  cached = {
    grid: token(styles, '--canvas-grid') || FALLBACK.grid,
    selection: token(styles, '--foreground') || FALLBACK.selection,
    label: token(styles, '--muted-foreground') || FALLBACK.label,
  }
  return cached
}

/** Drops the cached palette. For tests, and for a future theme switch. */
export function resetCanvasPalette(): void {
  cached = null
}

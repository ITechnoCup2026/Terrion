import type { TileLayout } from '@/lib/tilegrid/types'
import type { View } from './view'

/**
 * Works out which tile a click landed on, or null for empty space.
 * Runs the camera backwards: undo the canvas position, the pan, then the zoom.
 */
export function tileAt(
  view: View, cellPx: number, layout: TileLayout,
  clientX: number, clientY: number, rect: { left: number; top: number },
) {
  const worldX = (clientX - rect.left - view.offsetX) / view.scale
  const worldY = (clientY - rect.top - view.offsetY) / view.scale
  const col = Math.floor(worldX / cellPx)
  const row = Math.floor(worldY / cellPx)
  if (col < 0 || row < 0 || col >= layout.cols || row >= layout.rows) return null
  const index = row * layout.cols + col
  const v = layout.tiles[index]
  if (v === 0) return null
  return { col, row, index, blockIndex: v - 1 }
}

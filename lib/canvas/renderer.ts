import { cropCell } from './crops'
import { canvasPalette } from './palette'
import { drawGroundShadow } from './terrain'
import type { TileLayout } from '@/lib/tilegrid/types'

// How one block should look: its colour, its label, and which crop picture to use.
export type BlockStyle = {
  blockId: string
  label: string        // 'BLOK A · 0,32 ha'
  color: string        // border + fallback fill, from the Task 0.2 palette
  spriteRow: number
  stage: number        // 0..4
}

/**
 * Draws the ground: one coloured border per block.
 *
 * Borders are drawn per tile edge — an edge appears wherever the neighbouring
 * tile belongs to a different block — so any block shape outlines correctly.
 *
 * Both are skipped entirely on a single-block plot, which is most of them.
 * There is nothing to tell apart, the fence already marks that boundary, and
 * the label repeats the header. The grid lives in drawGrid, on the visible
 * canvas, because how much of it to draw depends on the zoom.
 */
export function drawBaseLayer(
  ctx: CanvasRenderingContext2D,
  layout: TileLayout,
  styles: Map<string, BlockStyle>,
  cellPx: number,
) {
  const { cols, rows, tiles, blockRanges } = layout
  ctx.clearRect(0, 0, cols * cellPx, rows * cellPx)

  // The grid is NOT drawn here. It belongs to drawGrid, on the visible canvas,
  // because how much of it to show depends on the zoom and this layer is
  // cached without one.

  // Labels are not drawn here either: they belong in drawBlockLabels, after
  // the crop layer, which is painted over this one.
  //
  // Block borders, per differing tile edge -- and only when there is more than
  // one block. A lone block's border is a coloured rectangle drawn just inside
  // the fence, which already marks that boundary and marks it truthfully.
  if (blockRanges.length < 2) return

  ctx.lineWidth = 2
  const at = (c: number, r: number) =>
    c < 0 || r < 0 || c >= cols || r >= rows ? 0 : tiles[r * cols + c]

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = at(c, r)
      if (v === 0) continue
      const style = styles.get(blockRanges[v - 1].blockId)
      if (!style) continue
      ctx.strokeStyle = style.color
      const x = c * cellPx, y = r * cellPx
      if (at(c, r - 1) !== v) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cellPx, y); ctx.stroke() }
      if (at(c, r + 1) !== v) { ctx.beginPath(); ctx.moveTo(x, y + cellPx); ctx.lineTo(x + cellPx, y + cellPx); ctx.stroke() }
      if (at(c - 1, r) !== v) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cellPx); ctx.stroke() }
      if (at(c + 1, r) !== v) { ctx.beginPath(); ctx.moveTo(x + cellPx, y); ctx.lineTo(x + cellPx, y + cellPx); ctx.stroke() }
    }
  }

}

/**
 * Block labels, drawn on the visible canvas after the crops.
 *
 * Not part of the cached base layer, which is where they used to live: the
 * sprite layer is painted over that one, so a block whose first tile grew
 * something tall -- chilli, a mature bush -- had its own name painted out by
 * its own plants. Drawing them last is the whole fix.
 *
 * Skipped entirely on a single-block plot. There is nothing to tell apart, and
 * the label only repeats the plot name and area already floating over the
 * canvas.
 */
export function drawBlockLabels(
  ctx: CanvasRenderingContext2D,
  layout: TileLayout,
  styles: Map<string, BlockStyle>,
  cellPx: number,
) {
  const { cols, blockRanges } = layout
  if (blockRanges.length < 2) return

  const palette = canvasPalette()
  const fontPx = Math.max(7, Math.floor(cellPx * 0.22))

  ctx.save()
  ctx.font = `600 ${fontPx}px ui-sans-serif, system-ui, sans-serif`
  ctx.textBaseline = 'top'

  for (const range of blockRanges) {
    const style = styles.get(range.blockId)
    if (!style) continue
    const c = range.startTile % cols, r = Math.floor(range.startTile / cols)
    const x = c * cellPx + 3
    const y = r * cellPx + 3

    // A chip behind the text: the label sits on soil, on crops, and on the
    // fence shadow depending on the block, and no single ink reads on all three.
    const width = ctx.measureText(style.label).width
    ctx.fillStyle = 'rgb(255 255 255 / 0.82)'
    ctx.beginPath()
    ctx.roundRect(x - 2, y - 1, width + 6, fontPx + 4, 3)
    ctx.fill()

    ctx.fillStyle = palette.label
    ctx.fillText(style.label, x + 1, y + 1)
  }
  ctx.restore()
}

/**
 * The tile grid, drawn on the visible canvas at the current zoom.
 *
 * It fades out as the camera pulls back. A line on every tile boundary is what
 * made the farm read as a spreadsheet with plants in the cells: at a scale
 * where a tile is 32 screen pixels the grid is most of what the eye sees.
 * Close in it is useful -- it is how the area is counted -- so it comes back.
 *
 * Line width is divided by the scale so it stays hairline at every zoom.
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  layout: TileLayout,
  cellPx: number,
  scale: number,
) {
  // Nothing below 2x, full strength from 3x, ramped between.
  const alpha = Math.max(0, Math.min(1, (scale - 2) / 1))
  if (alpha <= 0) return

  const { cols, rows } = layout
  ctx.save()
  ctx.globalAlpha = alpha * 0.55
  ctx.strokeStyle = canvasPalette().grid
  ctx.lineWidth = 1 / scale

  for (let c = 0; c <= cols; c++) {
    ctx.beginPath(); ctx.moveTo(c * cellPx, 0); ctx.lineTo(c * cellPx, rows * cellPx); ctx.stroke()
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * cellPx); ctx.lineTo(cols * cellPx, r * cellPx); ctx.stroke()
  }
  ctx.restore()
}

/**
 * Outlines the selected block on the visible canvas.
 * Drawn after the cached layers, never into them, so selecting is cheap.
 * Line width is divided by the zoom so the outline looks the same at every scale.
 */
export function drawSelection(
  ctx: CanvasRenderingContext2D,
  layout: TileLayout,
  blockIndex: number,
  cellPx: number,
  scale: number,
) {
  const { cols, rows, tiles } = layout
  const v = blockIndex + 1
  const at = (c: number, r: number) =>
    c < 0 || r < 0 || c >= cols || r >= rows ? 0 : tiles[r * cols + c]

  ctx.save()
  ctx.strokeStyle = canvasPalette().selection
  ctx.lineWidth = 3 / scale

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (at(c, r) !== v) continue
      const x = c * cellPx, y = r * cellPx
      if (at(c, r - 1) !== v) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cellPx, y); ctx.stroke() }
      if (at(c, r + 1) !== v) { ctx.beginPath(); ctx.moveTo(x, y + cellPx); ctx.lineTo(x + cellPx, y + cellPx); ctx.stroke() }
      if (at(c - 1, r) !== v) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cellPx); ctx.stroke() }
      if (at(c + 1, r) !== v) { ctx.beginPath(); ctx.moveTo(x + cellPx, y); ctx.lineTo(x + cellPx, y + cellPx); ctx.stroke() }
    }
  }
  ctx.restore()
}

/**
 * Draws what is growing on each tile.
 * With a crop sheet, stamps the right picture; without one, falls back to a
 * coloured square whose inner square grows with the crop, so maturity still reads.
 */
export function drawSpriteLayer(
  ctx: CanvasRenderingContext2D,
  layout: TileLayout,
  styles: Map<string, BlockStyle>,
  crops: HTMLImageElement | null,
  cellPx: number,
) {
  const { cols, rows, tiles, blockRanges } = layout
  ctx.clearRect(0, 0, cols * cellPx, rows * cellPx)
  ctx.imageSmoothingEnabled = false

  for (let i = 0; i < tiles.length; i++) {
    const v = tiles[i]
    if (v === 0) continue
    const style = styles.get(blockRanges[v - 1].blockId)
    if (!style) continue
    const x = (i % cols) * cellPx, y = Math.floor(i / cols) * cellPx

    if (crops) {
      // A plant with nothing under it floats. The pack's own trees and bushes
      // ship with a shadow baked in, which is exactly why they sat on the
      // ground and the crops did not. Grows with the plant, because a seedling
      // casts less than a full bush.
      if (style.stage > 0) {
        const spread = 0.16 + style.stage * 0.04
        drawGroundShadow(
          ctx,
          x + cellPx / 2, y + cellPx * 0.82,
          cellPx * spread, cellPx * spread * 0.42,
          0.10 + style.stage * 0.03,
        )
      }
      const { sx, sy, size } = cropCell(style.spriteRow, style.stage)
      ctx.drawImage(crops, sx, sy, size, size, x, y, cellPx, cellPx)
    } else {
      ctx.fillStyle = style.color
      ctx.globalAlpha = 0.25
      ctx.fillRect(x, y, cellPx, cellPx)
      ctx.globalAlpha = 1
      const inset = cellPx * (0.42 - style.stage * 0.08)
      ctx.fillRect(x + inset, y + inset, cellPx - inset * 2, cellPx - inset * 2)
    }
  }
}

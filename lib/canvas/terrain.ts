/**
 * Draws the decorative landscape around a plot.
 *
 * Everything here is scenery and says so: the caption on the canvas reads
 * "Pemandangan sekitar hanya ilustrasi." The one exception is the fence, which
 * sits on the real plot boundary and is therefore the only part of the picture
 * making a true claim. Nothing in this file may draw inside the plot rectangle
 * -- generateTerrain guarantees no cell or scatter item is there, and the fence
 * is drawn on the ring immediately outside it.
 */

import type { ScatterItem, TerrainLayout } from '@/lib/terrain/generate'
import { patchNoise, terrainIndex } from '@/lib/terrain/generate'
import type { TileLayout } from '@/lib/tilegrid/types'
import { TERRAIN_TILE, TREE_CELL, type TerrainSheets } from './sheets'

/** Where the farmhouse stands, in terrain tile coordinates. */
export type HousePlacement = { col: number; row: number }

/** How many tiles across the farmhouse is. */
export const HOUSE_TILES = 2

/**
 * Where the farmhouse stands: on the scenery OUTSIDE the fence.
 *
 * It used to sit in the middle of the plot rectangle and was drawn after the
 * crop layer, so it covered the field it was decorating -- a building planted
 * on top of somebody's berries. Outside the fence it obscures nothing, and it
 * is more honest besides: the house was always a UI anchor drawn as a house
 * rather than a claim that a building stands there. Indonesian smallholdings
 * are frequently nowhere near the farmer's house.
 *
 * Sides are tried in a fixed order, so the same plot always looks the same.
 * The SIDES come first, and that is a UI constraint rather than an aesthetic
 * one: the page floats its title card at top-centre and the time slider at
 * bottom-centre, and a house placed mid-bottom sat underneath the slider where
 * it could be seen but not clicked -- and clicking it is how the farm summary
 * opens. Right before left, because that is where a reader's cursor already is
 * after dismissing a panel.
 *
 * Returns null when the scenery border is too thin to hold it -- two tiles on
 * a narrow screen, where the house would overhang the fence.
 */
export function resolveHousePlacement(terrain: TerrainLayout): HousePlacement | null {
  const { plot, border } = terrain
  const midCol = plot.col + Math.floor((plot.cols - HOUSE_TILES) / 2)
  const midRow = plot.row + Math.floor((plot.rows - HOUSE_TILES) / 2)

  // One tile clear of the fence ring, which sits immediately outside the plot.
  const candidates: HousePlacement[] = [
    { col: plot.col + plot.cols + 1, row: midRow },          // right
    { col: plot.col - 1 - HOUSE_TILES, row: midRow },        // left
    { col: midCol, row: plot.row + plot.rows + 1 },          // below
    { col: midCol, row: plot.row - 1 - HOUSE_TILES },        // above
  ]

  return candidates.find(c => fitsOutside(terrain, c, border)) ?? null
}

// True when a 2x2 house at this spot is inside the picture, outside the plot,
// and not standing in water.
function fitsOutside(
  terrain: TerrainLayout, at: HousePlacement, border: number,
): boolean {
  if (border < 3) return false

  for (let r = 0; r < HOUSE_TILES; r++) {
    for (let c = 0; c < HOUSE_TILES; c++) {
      const col = at.col + c
      const row = at.row + r
      if (col < 0 || row < 0 || col >= terrain.cols || row >= terrain.rows) return false

      const cell = terrain.cells[terrainIndex(terrain, col, row)]
      // A null cell is inside the plot rectangle, which is exactly where the
      // house must not be any more.
      if (!cell || cell.water) return false
    }
  }
  return true
}

// Stamps one cell from a horizontal strip of same-sized tiles.
function stamp(
  ctx: CanvasRenderingContext2D, sheet: HTMLImageElement,
  index: number, count: number, cell: number,
  x: number, y: number, w: number, h: number,
) {
  const i = ((index % count) + count) % count
  ctx.drawImage(sheet, i * cell, 0, cell, cell, x, y, w, h)
}

// One tree or prop, mirrored half the time so few sprites do not read as a stamp.
function drawScatterItem(
  ctx: CanvasRenderingContext2D, sheets: TerrainSheets, item: ScatterItem, cellPx: number,
) {
  const tree = item.kind === 'tree'
  const sheet = tree ? sheets.trees : sheets.props
  const count = tree ? sheets.treeCount : sheets.propCount
  const cell = tree ? TREE_CELL : TERRAIN_TILE

  // A tree is 2x2 tiles and stands on its cell, so it is drawn up and left.
  const size = tree ? cellPx * 2 : cellPx
  const x = tree ? item.col * cellPx - cellPx / 2 : item.col * cellPx
  const y = tree ? item.row * cellPx - cellPx : item.row * cellPx

  ctx.save()
  if (item.flip) {
    ctx.translate(x + size, y)
    ctx.scale(-1, 1)
    stamp(ctx, sheet, item.variant, count, cell, 0, 0, size, size)
  } else {
    stamp(ctx, sheet, item.variant, count, cell, x, y, size, size)
  }
  ctx.restore()
}

/**
 * The static terrain: border ground, scatter, and the boundary fence.
 *
 * Cached off-screen and redrawn only when the seed or the plot shape changes,
 * which in practice means never. Water is deliberately not drawn here -- it is
 * its own layer so it can animate without re-rasterising any of this.
 */
export function drawTerrainLayer(
  ctx: CanvasRenderingContext2D,
  terrain: TerrainLayout,
  sheets: TerrainSheets,
  cellPx: number,
) {
  ctx.clearRect(0, 0, terrain.cols * cellPx, terrain.rows * cellPx)
  ctx.imageSmoothingEnabled = false

  for (let row = 0; row < terrain.rows; row++) {
    for (let col = 0; col < terrain.cols; col++) {
      const cell = terrain.cells[terrainIndex(terrain, col, row)]
      if (!cell) continue
      stamp(ctx, sheets.ground, cell.ground, sheets.groundCount, TERRAIN_TILE,
        col * cellPx, row * cellPx, cellPx, cellPx)
    }
  }

  // Sorted by row so a tree lower down overlaps the one behind it.
  for (const item of [...terrain.scatter].sort((a, b) => a.row - b.row)) {
    drawScatterItem(ctx, sheets, item, cellPx)
  }

  drawFence(ctx, terrain, sheets, cellPx)
}

/**
 * The fence, on the ring of cells immediately outside the plot.
 *
 * This is the only element of the scenery that is true, so it goes exactly on
 * the boundary and nowhere else. Corners get both rails, which is what a real
 * corner post looks like from above.
 */
const FENCE_RAIL_H = 0
const FENCE_RAIL_V = 1
const FENCE_POST = 2
const FENCE_TILES = 3

/** A post every few tiles, so a long run has rhythm instead of repetition. */
const POST_EVERY = 4

function drawFence(
  ctx: CanvasRenderingContext2D,
  terrain: TerrainLayout,
  sheets: TerrainSheets,
  cellPx: number,
) {
  const { plot } = terrain
  const left = plot.col - 1, right = plot.col + plot.cols
  const top = plot.row - 1, bottom = plot.row + plot.rows

  const put = (index: number, col: number, row: number) =>
    stamp(ctx, sheets.fence, index, FENCE_TILES, TERRAIN_TILE,
      col * cellPx, row * cellPx, cellPx, cellPx)

  for (let col = plot.col; col < plot.col + plot.cols; col++) {
    const post = (col - plot.col) % POST_EVERY === 0
    put(post ? FENCE_POST : FENCE_RAIL_H, col, top)
    put(post ? FENCE_POST : FENCE_RAIL_H, col, bottom)
  }
  for (let row = plot.row; row < plot.row + plot.rows; row++) {
    const post = (row - plot.row) % POST_EVERY === 0
    put(post ? FENCE_POST : FENCE_RAIL_V, left, row)
    put(post ? FENCE_POST : FENCE_RAIL_V, right, row)
  }

  // Corners are posts, which is what a real corner is: the rails end on it.
  for (const [col, row] of [[left, top], [right, top], [left, bottom], [right, bottom]]) {
    put(FENCE_POST, col, row)
  }
}

/**
 * The ground inside the fence: tilled soil where a block stands, grass between.
 *
 * This is the plot INTERIOR, which is why it lives here rather than in the
 * terrain layer proper -- it is not scenery, it is the ground the tiles
 * describe. It makes no geographic claim: every soil tile is the same soil, so
 * nothing about it says where anything is.
 *
 * The split matters. Since blocks became separate fields, the space between
 * and around them can be most of the enclosure -- three fields on a 0,72 ha
 * plot leave nearly half the grid empty. Painted as soil, that read as a huge
 * bare field somebody had failed to plant. Painted as grass, it reads as the
 * yard the fields sit in, which is what a farm actually looks like.
 *
 * It also makes the counting claim sharper rather than weaker: tilled ground
 * is now exactly the planted area, so the soil IS the hectares.
 *
 * Without any of it the crop sprites sit on the card background and float.
 */
export function drawFieldSoil(
  ctx: CanvasRenderingContext2D,
  terrain: TerrainLayout,
  sheets: TerrainSheets,
  cellPx: number,
  layout: TileLayout,
) {
  ctx.imageSmoothingEnabled = false
  const { plot } = terrain

  // Indices into GROUND in lib/terrain/motifs.ts. Worked soil and its two
  // pebbled variants; grass and its three tufts. Both laid in patches rather
  // than as one flat colour, or each reads as a rectangle somebody filled with
  // a paint bucket.
  const SOIL = 5, PEBBLE_A = 6, PEBBLE_B = 7
  const GRASS = 0, TUFT_A = 1, TUFT_B = 2
  const SOIL_PATCH = 3.5

  for (let row = plot.row; row < plot.row + plot.rows; row++) {
    for (let col = plot.col; col < plot.col + plot.cols; col++) {
      const n = patchNoise(terrain.seed ^ 0x5f3a, col, row, SOIL_PATCH)
      // The layout's own coordinates start at the plot's corner, not the
      // picture's.
      const owned = layout.tiles[(row - plot.row) * layout.cols + (col - plot.col)] !== 0
      const tile = owned
        ? (n < 0.62 ? SOIL : n < 0.84 ? PEBBLE_A : PEBBLE_B)
        : (n < 0.55 ? GRASS : n < 0.8 ? TUFT_A : TUFT_B)
      stamp(ctx, sheets.ground, tile, sheets.groundCount, TERRAIN_TILE,
        col * cellPx, row * cellPx, cellPx, cellPx)
    }
  }

  // The fence throws a short shadow onto the field it encloses, which is what
  // stops it reading as a sticker laid over the picture.
  //
  // It belongs here rather than in drawFence because this layer is painted
  // AFTER the terrain (see PlotCanvas), so a shadow drawn with the fence would
  // be covered by the soil a moment later.
  ctx.save()
  ctx.globalAlpha = 0.15
  ctx.fillStyle = '#1d2b16'
  ctx.fillRect(plot.col * cellPx, plot.row * cellPx, plot.cols * cellPx, cellPx * 0.3)
  ctx.fillRect(plot.col * cellPx, plot.row * cellPx, cellPx * 0.24, plot.rows * cellPx)
  ctx.restore()
}

/**
 * The water layer: only the cells that are water, at one animation frame.
 *
 * Separate from everything else because it is the single thing in the renderer
 * that ticks. Pan, zoom and slider drags re-rasterise nothing; this redraws a
 * handful of cells eight times a second, and not at all on a farm with no
 * water.
 */
export function drawWaterLayer(
  ctx: CanvasRenderingContext2D,
  terrain: TerrainLayout,
  sheets: TerrainSheets,
  frame: number,
  cellPx: number,
) {
  ctx.clearRect(0, 0, terrain.cols * cellPx, terrain.rows * cellPx)
  if (!terrain.hasWater) return
  ctx.imageSmoothingEnabled = false

  for (let row = 0; row < terrain.rows; row++) {
    for (let col = 0; col < terrain.cols; col++) {
      const cell = terrain.cells[terrainIndex(terrain, col, row)]
      if (!cell?.water) continue
      stamp(ctx, sheets.water, frame, sheets.waterFrames, TERRAIN_TILE,
        col * cellPx, row * cellPx, cellPx, cellPx)
    }
  }
}

/**
 * The farmhouse, drawn 2x2 tiles at its placement.
 *
 * Drawn after the crop layer rather than into the terrain layer as the spec's
 * table implies: it stands in the middle of the plot rectangle, so anything
 * underneath the crops would be completely hidden by them.
 *
 * Hidden when the plot is small, where it would obscure more than it adds.
 */
export function drawHouse(
  ctx: CanvasRenderingContext2D,
  _terrain: TerrainLayout,
  sheets: TerrainSheets,
  house: HousePlacement,
  cellPx: number,
) {
  ctx.imageSmoothingEnabled = false
  const x = house.col * cellPx
  const y = house.row * cellPx
  const size = cellPx * HOUSE_TILES

  // The pack's own trees and bushes ship with a shadow baked in; the house is
  // a separate illustration and does not, which is most of why it read as
  // pasted on rather than standing on the ground.
  drawGroundShadow(ctx, x + size / 2, y + size * 0.92, size * 0.42, size * 0.14, 0.22)

  ctx.drawImage(sheets.house, x, y, size, size)
}

/**
 * The soft dark patch a thing sits in.
 *
 * One ellipse, no blur filter: canvas shadowBlur costs a full-canvas
 * composite per call, and there is one of these under every plant.
 */
export function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, rx: number, ry: number, alpha: number,
) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#1d2b16'
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Did this click land on the farmhouse? Tested before any tile lookup. */
export function houseAt(
  _terrain: TerrainLayout, house: HousePlacement,
  worldX: number, worldY: number, cellPx: number,
): boolean {
  const x = house.col * cellPx, y = house.row * cellPx
  const size = cellPx * HOUSE_TILES
  return worldX >= x && worldX < x + size && worldY >= y && worldY < y + size
}

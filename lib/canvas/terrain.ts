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

import { PIECE, PIECE_COUNT, rimQuadrants } from '@/lib/terrain/autotile'
import type { ScatterItem, TerrainLayout } from '@/lib/terrain/generate'
import { patchNoise, terrainIndex } from '@/lib/terrain/generate'
import { LOWEST_RANK, MATERIAL_RANK, transitionMaterial } from '@/lib/terrain/motifs'
import type { TileLayout } from '@/lib/tilegrid/types'
import { TERRAIN_TILE, TREE_CELL, type TerrainSheets } from './sheets'

/**
 * What rank a cell's ground is, or Infinity where there is nothing to draw.
 *
 * Infinity rather than -1 because the callers all ask the same question of it:
 * "does the neighbour cover me?". Off the edge of the world, and inside the
 * plot rectangle where a different pass paints the ground, the answer has to be
 * yes -- otherwise every farm would draw a rim around the whole picture and
 * another one facing its own field.
 */
type RankAt = (col: number, row: number) => number

/** Half a tile, in the sheet's own pixels. One quadrant of a transition piece. */
const QUADRANT = TERRAIN_TILE / 2

/**
 * The transition sheet, recoloured to flat darkness but keeping its shape.
 *
 * This is how a ground edge casts a shadow that follows its actual ragged
 * outline instead of a straight band: stamp this a pixel down and right of
 * where the rim is about to go. Built once from the loaded sheet and kept,
 * because it is the same picture for the life of the page.
 */
let shadowSheet: { source: HTMLImageElement; canvas: HTMLCanvasElement } | null = null

function transitionShadow(sheet: HTMLImageElement): HTMLCanvasElement | null {
  if (shadowSheet?.source === sheet) return shadowSheet.canvas

  const canvas = document.createElement('canvas')
  canvas.width = sheet.width
  canvas.height = sheet.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(sheet, 0, 0)
  // source-in keeps the alpha it just drew and replaces every colour, so the
  // result is the silhouette of the rim rather than a rectangle.
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = '#1d2b16'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  shadowSheet = { source: sheet, canvas }
  return canvas
}

/** Drops the cached shadow sheet. For tests, and for a reloaded sprite set. */
export function resetTransitionShadow(): void {
  shadowSheet = null
}

/**
 * Walks a rectangle of cells, handing each one that needs a rim to `stamp`.
 *
 * Cells whose corners are all buried are skipped, which is most of them: only
 * the boundary pays for an overlay, and everywhere else keeps the tufted or
 * pebbled ground tile that was already painted there.
 */
function eachRimCell(
  bounds: { col: number; row: number; cols: number; rows: number },
  rankAt: RankAt,
  stamp: (col: number, row: number, rank: number,
          quadrants: ReturnType<typeof rimQuadrants>) => void,
) {
  for (let row = bounds.row; row < bounds.row + bounds.rows; row++) {
    for (let col = bounds.col; col < bounds.col + bounds.cols; col++) {
      const rank = rankAt(col, row)
      if (!Number.isFinite(rank) || rank <= LOWEST_RANK) continue

      const quadrants = rimQuadrants(
        (dc, dr) => rankAt(col + dc, row + dr) >= rank)
      if (!quadrants) continue

      stamp(col, row, rank, quadrants)
    }
  }
}

/**
 * The shadow each ground edge casts onto the ground below it.
 *
 * A whole pass of its own, run before any rim is drawn, so that a cell's
 * shadow can never land on a neighbour's finished edge.
 */
function drawRimShadows(
  ctx: CanvasRenderingContext2D,
  sheets: TerrainSheets,
  cellPx: number,
  bounds: { col: number; row: number; cols: number; rows: number },
  rankAt: RankAt,
) {
  const shadow = transitionShadow(sheets.transitions)
  if (!shadow) return

  const half = cellPx / 2
  const offset = Math.max(1, Math.round(cellPx / 16))

  ctx.save()
  ctx.globalAlpha = 0.18

  eachRimCell(bounds, rankAt, (col, row, rank, quadrants) => {
    const material = transitionMaterial(rank)
    for (const quadrant of quadrants!) {
      // A buried corner is a solid square; its shadow would be a dark block.
      if (quadrant.piece === PIECE.interior) continue
      const sx = (material * PIECE_COUNT + quadrant.piece) * TERRAIN_TILE
        + quadrant.qx * QUADRANT
      ctx.drawImage(
        shadow, sx, quadrant.qy * QUADRANT, QUADRANT, QUADRANT,
        col * cellPx + quadrant.qx * half + offset,
        row * cellPx + quadrant.qy * half + offset,
        half, half)
    }
  })

  ctx.restore()
}

/**
 * The organic edge itself, stamped a quadrant at a time.
 *
 * Every boundary in the picture goes through here: grass meeting soil outside
 * the fence, sand meeting soil, the yard meeting the tilled field inside it.
 * One set of pictures serves all of them because the pack draws its rims on
 * transparent backgrounds, so whatever was painted underneath shows through.
 */
function drawRims(
  ctx: CanvasRenderingContext2D,
  sheets: TerrainSheets,
  cellPx: number,
  bounds: { col: number; row: number; cols: number; rows: number },
  rankAt: RankAt,
) {
  const half = cellPx / 2

  eachRimCell(bounds, rankAt, (col, row, rank, quadrants) => {
    const material = transitionMaterial(rank)
    for (const quadrant of quadrants!) {
      const sx = (material * PIECE_COUNT + quadrant.piece) * TERRAIN_TILE
        + quadrant.qx * QUADRANT
      ctx.drawImage(
        sheets.transitions, sx, quadrant.qy * QUADRANT, QUADRANT, QUADRANT,
        col * cellPx + quadrant.qx * half,
        row * cellPx + quadrant.qy * half,
        half, half)
    }
  })
}

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

  // Now soften every boundary between two ground types. Off the edge of the
  // world, and inside the plot rectangle, nothing is drawn -- both read as
  // covered, so no rim is ever drawn facing them.
  const rankAt: RankAt = (col, row) => {
    if (col < 0 || row < 0 || col >= terrain.cols || row >= terrain.rows) return Infinity
    const cell = terrain.cells[terrainIndex(terrain, col, row)]
    return cell ? MATERIAL_RANK[cell.ground] : Infinity
  }
  const whole = { col: 0, row: 0, cols: terrain.cols, rows: terrain.rows }
  drawRimShadows(ctx, sheets, cellPx, whole, rankAt)
  drawRims(ctx, sheets, cellPx, whole, rankAt)

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

  // Which tile each cell got, kept so the rim pass can read the ground back
  // without repeating the noise lookup or, worse, disagreeing with it.
  const tiles = new Array<number>(plot.cols * plot.rows)

  for (let row = plot.row; row < plot.row + plot.rows; row++) {
    for (let col = plot.col; col < plot.col + plot.cols; col++) {
      const n = patchNoise(terrain.seed ^ 0x5f3a, col, row, SOIL_PATCH)
      // The layout's own coordinates start at the plot's corner, not the
      // picture's.
      const owned = layout.tiles[(row - plot.row) * layout.cols + (col - plot.col)] !== 0
      const tile = owned
        ? (n < 0.62 ? SOIL : n < 0.84 ? PEBBLE_A : PEBBLE_B)
        : (n < 0.55 ? GRASS : n < 0.8 ? TUFT_A : TUFT_B)
      tiles[(row - plot.row) * plot.cols + (col - plot.col)] = tile
      stamp(ctx, sheets.ground, tile, sheets.groundCount, TERRAIN_TILE,
        col * cellPx, row * cellPx, cellPx, cellPx)
    }
  }

  // The yard grass closes over the edge of the tilled ground, the same way it
  // does everywhere else in the picture.
  //
  // This changes only the EDGE ART. Which cells are soil still comes from
  // layout.tiles and nothing here touches it, so tilled ground is still
  // exactly the planted area and the soil is still the hectares.
  const rankAt: RankAt = (col, row) => {
    const c = col - plot.col, r = row - plot.row
    if (c < 0 || r < 0 || c >= plot.cols || r >= plot.rows) return Infinity
    return MATERIAL_RANK[tiles[r * plot.cols + c]]
  }
  drawRimShadows(ctx, sheets, cellPx, plot, rankAt)
  drawRims(ctx, sheets, cellPx, plot, rankAt)

  // The fence throws a short shadow onto the field it encloses, which is what
  // stops it reading as a sticker laid over the picture.
  //
  // It belongs here rather than in drawFence because this layer is painted
  // AFTER the terrain (see PlotCanvas), so a shadow drawn with the fence would
  // be covered by the soil a moment later.
  //
  // Stepped rather than flat: a shadow with an edge as hard as the thing
  // casting it reads as a painted stripe. Three bands is enough to fall off
  // convincingly and costs three fills.
  ctx.save()
  ctx.fillStyle = '#1d2b16'
  const BANDS = [
    { alpha: 0.16, depth: 0.12 },
    { alpha: 0.10, depth: 0.24 },
    { alpha: 0.06, depth: 0.38 },
  ]
  for (const band of BANDS) {
    ctx.globalAlpha = band.alpha
    ctx.fillRect(plot.col * cellPx, plot.row * cellPx,
      plot.cols * cellPx, cellPx * band.depth)
    ctx.fillRect(plot.col * cellPx, plot.row * cellPx,
      cellPx * band.depth * 0.8, plot.rows * cellPx)
  }
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

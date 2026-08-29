/**
 * Turns a plot's `terrain_seed` into the decorative landscape around it.
 *
 * Pure and deterministic: same seed, same terrain, forever. Nothing is stored
 * per cell and nothing is cached, so a reseed of the demo data reproduces
 * identical farms and a plot's scenery is a few hundred small integers rather
 * than an image.
 *
 * The binding rule from the parent spec: a tile grid makes no geographic claim.
 * Scenery therefore lives strictly OUTSIDE the plot rectangle -- the interior
 * stays blocks, crops and grid lines, and `area_ha` stays derivable by counting
 * tiles. The only element of the scenery that is true is the fence, which the
 * renderer draws on the plot boundary itself.
 */

import { motif, MOTIF_NAMES, type MotifName, type ScatterKind } from './motifs'

export type EdgeName = 'top' | 'bottom' | 'left' | 'right'

export type TerrainCell = {
  ground: number
  water: boolean
  /** Which edge's motif drew this cell. Corners resolve to exactly one. */
  owner: EdgeName
}

export type ScatterItem = {
  kind: ScatterKind
  /** Which sprite from the kind's sheet; the renderer takes this modulo its count. */
  variant: number
  col: number
  row: number
  /** Drawn mirrored, so a handful of sprites do not read as a repeating stamp. */
  flip: boolean
}

export type TerrainLayout = {
  cols: number
  rows: number
  border: number
  plot: { col: number; row: number; cols: number; rows: number }
  /** Row-major, length cols*rows. Null inside the plot rectangle. */
  cells: (TerrainCell | null)[]
  scatter: ScatterItem[]
  /** True when any cell is water. Gates the animation loop entirely. */
  hasWater: boolean
  motifs: Record<EdgeName, MotifName>
  /** The seed this was generated from, so the renderer can texture the field
   *  interior from the same noise without a second source of truth. */
  seed: number
}

/** Index into `cells` for a terrain coordinate. */
export function terrainIndex(t: { cols: number }, col: number, row: number): number {
  return row * t.cols + col
}

// xmur3: spreads a single integer seed into a well-mixed 32-bit state. Without
// it, neighbouring seeds (1, 2, 3 -- exactly what a sequence of plots gets)
// produce visibly similar terrain.
function xmur3(seed: number): () => number {
  let h = 1779033703 ^ seed
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

// mulberry32: small, fast, and good enough for decoration.
function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Spatially coherent noise in [0,1), deterministic from the seed.
 *
 * Choosing each cell's ground independently makes a motif read as static: the
 * pasture becomes a checkerboard of light and dark, and nothing looks like
 * ground. Sampling a coarse lattice and smoothing between its corners groups
 * cells into patches instead, so tufts and stones gather the way they do in a
 * field. Cheap value noise, not Perlin -- this is decoration, not a heightmap.
 */
export function patchNoise(seed: number, col: number, row: number, scale: number): number {
  const corner = (cx: number, cy: number) => {
    let h = seed ^ Math.imul(cx, 374761393) ^ Math.imul(cy, 668265263)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  const x = col / scale, y = row / scale
  const x0 = Math.floor(x), y0 = Math.floor(y)
  const fx = x - x0, fy = y - y0
  // Smoothstep, so patches have soft edges rather than lattice seams.
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)

  const top = corner(x0, y0) * (1 - sx) + corner(x0 + 1, y0) * sx
  const bottom = corner(x0, y0 + 1) * (1 - sx) + corner(x0 + 1, y0 + 1) * sx
  return top * (1 - sy) + bottom * sy
}

/** How many tiles across one patch of ground tends to run. */
const PATCH_SCALE = 2.5

const EDGES: readonly EdgeName[] = ['top', 'bottom', 'left', 'right'] as const

/** How far a seam between two motifs wanders, in tiles. */
const SEAM_WANDER = 1.6

/**
 * Which edge owns a border cell.
 *
 * The cell goes to whichever edge is nearest, with the distance perturbed by
 * smooth noise so the seam between two motifs WANDERS instead of running dead
 * straight.
 *
 * Straight was the previous behaviour and it was the single most artificial
 * thing on the canvas: precedence went top, bottom, left, right, so a farm
 * whose right edge was 'rocky' and whose top was 'pasture' showed a hard
 * vertical line with brown on one side and green on the other, from the fence
 * to the edge of the picture. Real ground does not change colour along a
 * ruler. The noise is the same kind already used for ground patches, at a
 * coarser scale, so the seam bends in slow curves rather than jittering.
 *
 * Still deterministic, and every cell still resolves to exactly one edge.
 */
function ownerOf(
  seed: number,
  col: number, row: number, cols: number, rows: number, border: number,
): { edge: EdgeName; depth: number } | null {
  const distance: Record<EdgeName, number> = {
    top: row,
    bottom: rows - 1 - row,
    left: col,
    right: cols - 1 - col,
  }

  // Inside the plot rectangle: not ours to draw.
  if (Math.min(...EDGES.map(e => distance[e])) >= border) return null

  let best: EdgeName = 'top'
  let bestScore = Infinity
  for (let i = 0; i < EDGES.length; i++) {
    const edge = EDGES[i]
    // A separate noise field per edge, so two edges never wander in lockstep.
    const wander = (patchNoise(seed + i * 9176, col, row, SEAM_WANDER * 2) - 0.5)
      * SEAM_WANDER
    const score = distance[edge] + wander
    if (score < bestScore) {
      bestScore = score
      best = edge
    }
  }

  // The wander can hand a cell to an edge it is further from than the border is
  // deep. Motifs index by depth, so clamp rather than let them read past it.
  return { edge: best, depth: Math.min(distance[best], border - 1) }
}

export function generateTerrain(
  seed: number, plotCols: number, plotRows: number, border: number,
): TerrainLayout {
  if (border < 1) throw new Error('Terrain border must be at least one tile.')
  if (plotCols < 1 || plotRows < 1) throw new Error('A plot needs at least one tile.')

  const hash = xmur3(seed)
  const pick = mulberry32(hash())
  const cellRandom = mulberry32(hash())

  // One motif per edge, drawn before any cell so the choice does not depend on
  // how many cells happen to be visited first.
  const motifs = {
    top: MOTIF_NAMES[Math.floor(pick() * MOTIF_NAMES.length)],
    bottom: MOTIF_NAMES[Math.floor(pick() * MOTIF_NAMES.length)],
    left: MOTIF_NAMES[Math.floor(pick() * MOTIF_NAMES.length)],
    right: MOTIF_NAMES[Math.floor(pick() * MOTIF_NAMES.length)],
  } satisfies Record<EdgeName, MotifName>

  const cols = plotCols + border * 2
  const rows = plotRows + border * 2
  const plot = { col: border, row: border, cols: plotCols, rows: plotRows }

  const cells: (TerrainCell | null)[] = new Array(cols * rows).fill(null)
  const scatter: ScatterItem[] = []
  let hasWater = false

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const owned = ownerOf(seed, col, row, cols, rows, border)
      if (!owned) continue                       // inside the plot: not ours to draw

      const m = motif(motifs[owned.edge])
      // Ground is patchy; water and scatter stay per-cell, because a river
      // follows the edge it is on and a tree either stands here or does not.
      const rGround = patchNoise(seed, col, row, PATCH_SCALE)
      const rWater = cellRandom()
      const rScatter = cellRandom()

      const water = m.water(owned.depth, border, rWater)
      if (water) hasWater = true

      cells[terrainIndex({ cols }, col, row)] = {
        ground: m.ground(owned.depth, border, rGround),
        water,
        owner: owned.edge,
      }

      // Nothing stands in water, and nothing stands on the ring touching the
      // plot -- a tree there would overhang the fence and read as being in the
      // field.
      if (water || owned.depth === border - 1) continue

      const kind = m.scatter(owned.depth, border, rScatter)
      if (!kind) continue

      scatter.push({
        kind,
        variant: Math.floor(cellRandom() * 1024),
        col,
        row,
        flip: cellRandom() < 0.5,
      })
    }
  }

  return { cols, rows, border, plot, cells, scatter, hasWater, motifs, seed }
}

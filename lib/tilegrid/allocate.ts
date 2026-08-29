import { MAX_TILES, TILE_SIZE_STEPS, type BlockInput, type BlockRange, type TileLayout } from './types'

/**
 * Picks how much ground one tile covers, in m².
 * Bigger plots get bigger tiles so the tile count stays under the cap.
 */
export function resolveTileSize(areaHa: number): number {
  const areaM2 = areaHa * 10_000
  for (const step of TILE_SIZE_STEPS) {
    if (areaM2 / step <= MAX_TILES) return step
  }
  return TILE_SIZE_STEPS[TILE_SIZE_STEPS.length - 1]
}

/** Empty ground between fields. One tile is enough to read as a path. */
const GUTTER = 1

/** Fields are laid out near 4:3, the same proportion the whole grid used to be. */
const ASPECT = 4 / 3

type Rect = { w: number; h: number; count: number }

/** How far from 4:3 a field may be shaped before it reads as a corridor. */
const MAX_SKEW = Math.LN2

/**
 * The rectangle one block's tiles are arranged in.
 *
 * A tile count rarely divides into the nearest 4:3 rectangle, and the leftover
 * shows: 36 tiles at 7 wide needs 6 rows and fills 36 of 42, so the block is
 * drawn with a notch bitten out of its bottom-right corner. With a coloured
 * outline around it that does not read as a field with a short furrow, it
 * reads as a bug.
 *
 * So an EXACT factorisation is preferred when the count has one that is not
 * badly shaped -- 36 becomes 6x6 rather than 7x6-minus-6. Prime and awkward
 * counts have no such pair, and those fall back to the ragged rectangle, which
 * is still correct: a block owns a tile count, not a shape.
 */
function rectFor(count: number): Rect {
  const skewOf = (w: number, h: number) => Math.abs(Math.log((w / h) / ASPECT))

  let best: Rect | null = null
  for (let w = 1; w * w <= count; w++) {
    if (count % w !== 0) continue
    // Both ways round: a divisor pair gives a wide field and a tall one.
    for (const [width, height] of [[count / w, w], [w, count / w]] as const) {
      if (skewOf(width, height) > MAX_SKEW) continue
      if (!best || skewOf(width, height) < skewOf(best.w, best.h)) {
        best = { w: width, h: height, count }
      }
    }
  }
  if (best) return best

  const w = Math.max(1, Math.round(Math.sqrt(count * ASPECT)))
  return { w, h: Math.ceil(count / w), count }
}

type Placement = { rect: Rect; col: number; row: number }

/** Shelf-packs the fields left to right, wrapping at `targetWidth`. */
function packAt(rects: Rect[], targetWidth: number) {
  const placed: Placement[] = []
  let penX = 0
  let penY = 0
  let shelfHeight = 0

  for (const rect of rects) {
    // Wrap when this field would push the shelf past the target -- unless the
    // shelf is empty, in which case a field wider than the target still has to
    // go somewhere.
    if (penX > 0 && penX + rect.w > targetWidth) {
      penY += shelfHeight + GUTTER
      penX = 0
      shelfHeight = 0
    }
    placed.push({ rect, col: penX, row: penY })
    penX += rect.w + GUTTER
    shelfHeight = Math.max(shelfHeight, rect.h)
  }

  return {
    placed,
    cols: Math.max(...placed.map(p => p.col + p.rect.w), 1),
    rows: penY + shelfHeight,
  }
}

/**
 * Arranges the fields, choosing where the rows wrap.
 *
 * Guessing a wrap width from the total area does not work: it ignores the
 * gutters and assumes the rectangles tile perfectly, and two fields of 9x7 and
 * 7x6 came out as a 9x14 tower when 17x7 was available. There are never many
 * blocks, so every wrap width is simply tried and the best-shaped result kept.
 *
 * The score is in tiles, so the two things being traded off are comparable:
 * how much ground is not crop, plus what that shape costs in letterboxing.
 * Three fields can go in one row at 26x7 -- barely any waste, but 3.7:1, and
 * the camera then fills a third of the screen -- or in an L at 19x13, which is
 * well shaped and wastes 97 tiles. 15x15 beats both, and only a search finds it.
 */
function packFields(rects: Rect[]) {
  const widest = Math.max(...rects.map(r => r.w), 1)
  const fullRow = rects.reduce((s, r) => s + r.w, 0) + GUTTER * (rects.length - 1)
  const crop = rects.reduce((s, r) => s + r.count, 0)

  let best = packAt(rects, widest)
  let bestScore = Infinity

  for (let width = widest; width <= Math.max(widest, fullRow); width++) {
    const candidate = packAt(rects, width)
    const area = candidate.cols * candidate.rows
    // Log ratio, so 2:1 and 1:2 are penalised by the same amount.
    const skew = Math.abs(Math.log((candidate.cols / candidate.rows) / ASPECT))
    const score = (area - crop) + area * 0.5 * skew
    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  }

  return best
}

/**
 * Turns a real plot into a grid of tiles and hands each block its share.
 * Returns `tiles`, one number per square: 0 = empty, n = the nth block.
 *
 * Blocks are laid out as SEPARATE FIELDS with a gap between them. They used to
 * be handed contiguous runs of tile indices, which packed them edge to edge
 * into one slab -- three crops on a plot read as a single field with colour
 * banding across it, rather than as three things a farmer planted in three
 * places. The gap is the whole difference.
 *
 * What the gap must not cost is the property everything else rests on: a
 * block's area is still exactly its tile count times `tileSizeM2`, and gutter
 * tiles are 0, so they belong to no block, hit-test to nothing, and are never
 * counted. The grid simply gets bigger than the number of tiles in it.
 */
export function allocateTiles(input: {
  plotAreaHa: number
  blocks: BlockInput[]
}): TileLayout {
  const areaM2 = input.plotAreaHa * 10_000
  const step = resolveTileSize(input.plotAreaHa)
  const uncapped = Math.max(1, Math.round(areaM2 / step))

  // Past 40 ha the step ladder runs out, so tiles grow instead of multiplying.
  const totalTiles = Math.min(uncapped, MAX_TILES)
  const tileSizeM2 = uncapped > MAX_TILES ? areaM2 / totalTiles : step

  const ordered = [...input.blocks].sort((a, b) => a.orderIndex - b.orderIndex)

  // Floor, then hand every leftover tile to the largest block (spec §7.1).
  // Flooring guarantees the leftover is non-negative, so conservation is exact.
  const counts = ordered.map(b => Math.max(1, Math.floor((b.areaHa * 10_000) / tileSizeM2)))
  let leftover = totalTiles - counts.reduce((s, c) => s + c, 0)

  if (counts.length > 0) {
    let largest = 0
    for (let i = 1; i < counts.length; i++) if (counts[i] > counts[largest]) largest = i

    if (leftover > 0) {
      counts[largest] += leftover
    } else {
      // Only possible when min-1 clamping over-allocated; reclaim largest-first,
      // never dropping a block below one tile.
      let i = 0
      const bySize = counts.map((_, idx) => idx).sort((a, b) => counts[b] - counts[a])
      while (leftover < 0 && i < bySize.length * 64) {
        const idx = bySize[i % bySize.length]
        if (counts[idx] > 1) { counts[idx] -= 1; leftover += 1 }
        i++
      }
    }
  }

  const rects = counts.map(rectFor)
  const { placed, cols, rows } = packFields(rects)

  const tiles = new Uint16Array(cols * rows)
  const blockRanges: BlockRange[] = []

  placed.forEach((p, idx) => {
    let written = 0
    let startTile = -1

    for (let r = 0; r < p.rect.h && written < p.rect.count; r++) {
      for (let c = 0; c < p.rect.w && written < p.rect.count; c++) {
        const index = (p.row + r) * cols + (p.col + c)
        if (startTile < 0) startTile = index
        tiles[index] = idx + 1
        written++
      }
    }

    blockRanges.push({
      blockId: ordered[idx].id,
      blockIndex: idx,
      // The block's first tile, which is where drawBaseLayer stamps its label.
      // No longer a run: tiles between startTile and the block's last one may
      // belong to a neighbour or to a gutter.
      startTile,
      tileCount: p.rect.count,
    })
  })

  return { tileSizeM2, totalTiles, cols, rows, tiles, blockRanges }
}

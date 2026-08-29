import { describe, it, expect } from 'vitest'
import { allocateTiles, resolveTileSize } from './allocate'
import { MAX_TILES, type TileLayout } from './types'

const block = (id: string, areaHa: number, orderIndex = 0) => ({ id, areaHa, orderIndex })

// Every tile belonging to one block, as {col,row} pairs.
function cellsOf(layout: TileLayout, blockIndex: number) {
  const cells: { col: number; row: number }[] = []
  for (let i = 0; i < layout.tiles.length; i++) {
    if (layout.tiles[i] === blockIndex + 1) {
      cells.push({ col: i % layout.cols, row: Math.floor(i / layout.cols) })
    }
  }
  return cells
}

describe('resolveTileSize', () => {
  it('keeps 100 m² when the plot fits under the tile cap', () => {
    expect(resolveTileSize(1.4)).toBe(100)   // 140 tiles
  })

  it('promotes to 250 m² when 100 m² would exceed the cap', () => {
    expect(resolveTileSize(5)).toBe(250)     // 500 tiles at 100, 200 at 250
  })

  it('promotes all the way to 1000 m² for a very large plot', () => {
    expect(resolveTileSize(50)).toBe(1000)
  })
})

describe('allocateTiles', () => {
  it('conserves plot area to within one tile', () => {
    const layout = allocateTiles({ plotAreaHa: 1.4, blocks: [block('a', 1.4)] })
    const representedHa = (layout.totalTiles * layout.tileSizeM2) / 10_000
    expect(Math.abs(representedHa - 1.4)).toBeLessThanOrEqual(layout.tileSizeM2 / 10_000)
  })

  it('allocates exactly totalTiles across the blocks', () => {
    const layout = allocateTiles({
      plotAreaHa: 1.4,
      blocks: [block('a', 0.32, 0), block('b', 0.58, 1), block('c', 0.5, 2)],
    })
    const sum = layout.blockRanges.reduce((s, r) => s + r.tileCount, 0)
    expect(sum).toBe(layout.totalTiles)
  })

  it('never exceeds the tile cap', () => {
    for (const areaHa of [0.05, 1.4, 4, 9, 40, 400]) {
      expect(allocateTiles({ plotAreaHa: areaHa, blocks: [block('a', areaHa)] }).totalTiles)
        .toBeLessThanOrEqual(MAX_TILES)
    }
  })

  it('gives every block at least one tile even when it rounds to zero', () => {
    const layout = allocateTiles({
      plotAreaHa: 2.0,
      blocks: [block('big', 1.999, 0), block('sliver', 0.001, 1)],
    })
    expect(layout.blockRanges.find(r => r.blockId === 'sliver')!.tileCount).toBeGreaterThanOrEqual(1)
  })

  it('is deterministic', () => {
    const input = { plotAreaHa: 1.4, blocks: [block('a', 0.7, 0), block('b', 0.7, 1)] }
    expect(Array.from(allocateTiles(input).tiles)).toEqual(Array.from(allocateTiles(input).tiles))
  })

  it('orders blocks by orderIndex regardless of array order', () => {
    const layout = allocateTiles({
      plotAreaHa: 1.0,
      blocks: [block('second', 0.5, 1), block('first', 0.5, 0)],
    })
    expect(layout.blockRanges[0].blockId).toBe('first')
  })

  it('conserves plot area for plots past the largest tile step', () => {
    for (const areaHa of [50, 400]) {
      const layout = allocateTiles({ plotAreaHa: areaHa, blocks: [block('a', areaHa)] })
      const representedHa = (layout.totalTiles * layout.tileSizeM2) / 10_000
      expect(Math.abs(representedHa - areaHa)).toBeLessThanOrEqual(layout.tileSizeM2 / 10_000)
    }
  })

  it('still allocates exactly totalTiles across blocks past the largest tile step', () => {
    const layout = allocateTiles({
      plotAreaHa: 400,
      blocks: [block('a', 180, 0), block('b', 120, 1), block('c', 100, 2)],
    })
    const sum = layout.blockRanges.reduce((s, r) => s + r.tileCount, 0)
    expect(sum).toBe(layout.totalTiles)
    expect(layout.totalTiles).toBeLessThanOrEqual(MAX_TILES)
  })

  // ---- separated fields -------------------------------------------------
  //
  // Blocks used to be handed contiguous runs of tile indices, which packed
  // them against each other as one undifferentiated slab -- three crops read
  // as one field with colour banding. Each block is now its own field with a
  // gap around it.

  it('gives a single block the whole grid, with no gutter around it', () => {
    // The overwhelmingly common case today, and it must not gain a margin.
    const layout = allocateTiles({ plotAreaHa: 0.72, blocks: [block('a', 0.72)] })
    expect(layout.cols * layout.rows).toBeGreaterThanOrEqual(layout.totalTiles)
    // A single field starts in the corner.
    expect(layout.tiles[0]).toBe(1)
  })

  it('separates two blocks by at least one empty tile', () => {
    const layout = allocateTiles({
      plotAreaHa: 1.0, blocks: [block('a', 0.5, 0), block('b', 0.5, 1)],
    })
    const a = cellsOf(layout, 0)
    const b = cellsOf(layout, 1)
    expect(a.length).toBeGreaterThan(0)
    expect(b.length).toBeGreaterThan(0)

    // No tile of A is orthogonally adjacent to a tile of B.
    const inB = new Set(b.map(c => `${c.col},${c.row}`))
    for (const c of a) {
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        expect(inB.has(`${c.col + dc},${c.row + dr}`)).toBe(false)
      }
    }
  })

  it('keeps three blocks pairwise separated', () => {
    const layout = allocateTiles({
      plotAreaHa: 1.5,
      blocks: [block('a', 0.5, 0), block('b', 0.5, 1), block('c', 0.5, 2)],
    })
    const sets = [0, 1, 2].map(i => new Set(cellsOf(layout, i).map(c => `${c.col},${c.row}`)))
    for (let i = 0; i < 3; i++) {
      for (const key of sets[i]) {
        const [col, row] = key.split(',').map(Number)
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const neighbour = `${col + dc},${row + dr}`
          for (let j = 0; j < 3; j++) {
            if (i !== j) expect(sets[j].has(neighbour)).toBe(false)
          }
        }
      }
    }
  })

  it('lays each block out as a rectangle, filled row by row', () => {
    const layout = allocateTiles({
      plotAreaHa: 1.4,
      blocks: [block('a', 0.6, 0), block('b', 0.8, 1)],
    })
    for (let i = 0; i < 2; i++) {
      const cells = cellsOf(layout, i)
      const cols = [...new Set(cells.map(c => c.col))]
      const rows = [...new Set(cells.map(c => c.row))]
      // Contiguous span on both axes: a field, not a scatter.
      expect(Math.max(...cols) - Math.min(...cols) + 1).toBe(cols.length)
      expect(Math.max(...rows) - Math.min(...rows) + 1).toBe(rows.length)
    }
  })

  it('never gives one tile to two blocks', () => {
    const layout = allocateTiles({
      plotAreaHa: 3,
      blocks: [block('a', 1, 0), block('b', 1, 1), block('c', 1, 2)],
    })
    const seen = new Map<number, number>()
    for (const v of layout.tiles) if (v !== 0) seen.set(v, (seen.get(v) ?? 0) + 1)
    for (const range of layout.blockRanges) {
      expect(seen.get(range.blockIndex + 1)).toBe(range.tileCount)
    }
  })

  it('places every tile inside the grid it reports', () => {
    for (const n of [1, 2, 3, 5, 8]) {
      const blocks = Array.from({ length: n }, (_, i) => block(`b${i}`, 1, i))
      const layout = allocateTiles({ plotAreaHa: n, blocks })
      expect(layout.tiles.length).toBe(layout.cols * layout.rows)
      const filled = layout.tiles.reduce((s, v) => s + (v === 0 ? 0 : 1), 0)
      expect(filled).toBe(layout.totalTiles)
    }
  })

  it('does not let the gutters run away with the picture', () => {
    // Whitespace is the point, but a grid that is mostly gaps stops reading as
    // a farm and starts reading as a bug.
    const layout = allocateTiles({
      plotAreaHa: 3,
      blocks: [block('a', 1, 0), block('b', 1, 1), block('c', 1, 2)],
    })
    expect(layout.totalTiles / (layout.cols * layout.rows)).toBeGreaterThan(0.5)
  })

  it('reports each block a startTile that really belongs to it', () => {
    // drawBaseLayer stamps the block's label at startTile, so a startTile
    // pointing into a gutter would caption empty ground.
    const layout = allocateTiles({
      plotAreaHa: 2, blocks: [block('a', 1, 0), block('b', 1, 1)],
    })
    for (const range of layout.blockRanges) {
      expect(layout.tiles[range.startTile]).toBe(range.blockIndex + 1)
    }
  })
})

describe('field shape', () => {
  // A block drawn with a notch bitten out of one corner reads as a rendering
  // fault, not as a field. Where the tile count divides into a sane rectangle,
  // it should be used.
  it('fills its rectangle exactly when the count allows it', () => {
    const layout = allocateTiles({
      plotAreaHa: 0.72,
      blocks: [
        { id: 'a', areaHa: 0.36, orderIndex: 0 },
        { id: 'b', areaHa: 0.36, orderIndex: 1 },
      ],
    })

    for (const range of layout.blockRanges) {
      const cells = cellsOf(layout, range.blockIndex)
      const width = Math.max(...cells.map(c => c.col)) - Math.min(...cells.map(c => c.col)) + 1
      const height = Math.max(...cells.map(c => c.row)) - Math.min(...cells.map(c => c.row)) + 1
      expect(width * height).toBe(range.tileCount)
    }
  })

  // The fallback still has to work: 37 is prime, so no rectangle fits it and
  // the ragged one is correct. What must not change is the tile count.
  it('keeps the count exact when no rectangle fits', () => {
    const layout = allocateTiles({
      plotAreaHa: 0.37,
      blocks: [{ id: 'a', areaHa: 0.37, orderIndex: 0 }],
    })
    expect(layout.blockRanges[0].tileCount).toBe(layout.totalTiles)
    expect(cellsOf(layout, 0)).toHaveLength(layout.totalTiles)
  })
})

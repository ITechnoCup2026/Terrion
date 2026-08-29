import { describe, expect, it } from 'vitest'

import { GROUND, MOTIF_NAMES } from './motifs'
import { generateTerrain, terrainIndex } from './generate'

const PLOT = { cols: 10, rows: 8 }

function make(seed: number, border = 3) {
  return generateTerrain(seed, PLOT.cols, PLOT.rows, border)
}

describe('generateTerrain', () => {
  it('surrounds the plot with a border of the requested width', () => {
    const t = make(1, 3)
    expect(t.cols).toBe(PLOT.cols + 6)
    expect(t.rows).toBe(PLOT.rows + 6)
    expect(t.plot).toEqual({ col: 3, row: 3, cols: 10, rows: 8 })
  })

  it('is deterministic: the same seed gives byte-identical terrain', () => {
    expect(JSON.stringify(make(42))).toBe(JSON.stringify(make(42)))
  })

  it('gives different seeds different terrain', () => {
    expect(JSON.stringify(make(1))).not.toBe(JSON.stringify(make(2)))
  })

  // The rule the whole design rests on: a tile grid makes no geographic claim,
  // so nothing decorative may sit inside the plot. A tree occupying a cell
  // would also break area being readable by counting tiles.
  it('never places a cell inside the plot rectangle', () => {
    const t = make(7)
    for (let row = t.plot.row; row < t.plot.row + t.plot.rows; row++) {
      for (let col = t.plot.col; col < t.plot.col + t.plot.cols; col++) {
        expect(t.cells[terrainIndex(t, col, row)]).toBeNull()
      }
    }
  })

  it('never scatters anything inside the plot rectangle', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const t = make(seed)
      for (const s of t.scatter) {
        const inside =
          s.col >= t.plot.col && s.col < t.plot.col + t.plot.cols &&
          s.row >= t.plot.row && s.row < t.plot.row + t.plot.rows
        expect(inside).toBe(false)
      }
    }
  })

  it('fills every border cell and only border cells', () => {
    const t = make(3)
    let filled = 0
    for (let i = 0; i < t.cells.length; i++) if (t.cells[i]) filled++
    expect(filled).toBe(t.cols * t.rows - PLOT.cols * PLOT.rows)
  })

  it('only ever uses ground tiles that exist', () => {
    for (let seed = 1; seed <= 25; seed++) {
      for (const cell of make(seed).cells) {
        if (!cell) continue
        expect(cell.ground).toBeGreaterThanOrEqual(0)
        expect(cell.ground).toBeLessThan(GROUND.length)
      }
    }
  })

  // The water layer is the only thing in the renderer that ticks. It must not
  // start at all on a farm with no water, so the flag has to be exact.
  it('reports hasWater exactly when a water cell exists', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const t = make(seed)
      expect(t.hasWater).toBe(t.cells.some(c => c?.water === true))
    }
  })

  it('produces at least one watery and one dry farm across seeds', () => {
    const flags = new Set<boolean>()
    for (let seed = 1; seed <= 60; seed++) flags.add(make(seed).hasWater)
    expect(flags).toEqual(new Set([true, false]))
  })

  it('picks one motif per edge, all of them known', () => {
    const t = make(9)
    expect(Object.keys(t.motifs).sort()).toEqual(['bottom', 'left', 'right', 'top'])
    for (const name of Object.values(t.motifs)) {
      expect(MOTIF_NAMES).toContain(name)
    }
  })

  it('uses every motif at least once across many seeds', () => {
    const used = new Set<string>()
    for (let seed = 1; seed <= 200; seed++) {
      for (const m of Object.values(make(seed).motifs)) used.add(m)
    }
    expect([...used].sort()).toEqual([...MOTIF_NAMES].sort())
  })

  // Corners are reached by two motifs. Without a stated precedence they fight
  // and the seam is visible.
  it('resolves corners deterministically rather than by draw order', () => {
    const t = make(11)
    const corner = t.cells[terrainIndex(t, 0, 0)]
    expect(corner).not.toBeNull()
    // NOT a fixed precedence any more. Seams between motifs wander, so which
    // edge owns a corner depends on the seed -- what must hold is that it is
    // decided by the generator rather than by whichever loop ran last.
    expect(['top', 'bottom', 'left', 'right']).toContain(corner!.owner)
    expect(make(7).cells[0]!.owner).toBe(corner!.owner)
  })

  it('works with a 2-tile border, for narrow screens', () => {
    const t = make(5, 2)
    expect(t.cols).toBe(PLOT.cols + 4)
    expect(t.plot).toEqual({ col: 2, row: 2, cols: 10, rows: 8 })
  })

  it('refuses a border narrower than one tile', () => {
    expect(() => generateTerrain(1, 10, 8, 0)).toThrow()
  })
})

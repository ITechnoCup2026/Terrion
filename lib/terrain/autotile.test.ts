import { describe, expect, it } from 'vitest'

import { CORNERS, PIECE, PIECE_COUNT, cornerPiece, rimQuadrants } from './autotile'

/**
 * A neighbourhood as an 8-bit mask, so a test can walk every arrangement there
 * is. Bit order is the reading order of the eight cells around the centre:
 * NW N NE W E SW S SE.
 */
const OFFSETS: [number, number][] = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
]

function neighbourhood(mask: number) {
  return (dc: number, dr: number) => {
    const bit = OFFSETS.findIndex(([c, r]) => c === dc && r === dr)
    return bit >= 0 && (mask & (1 << bit)) !== 0
  }
}

const ALL = 0xff

describe('cornerPiece', () => {
  it('turns a corner where neither straight neighbour is present', () => {
    expect(cornerPiece(CORNERS[0], false, false, false)).toBe(PIECE.convexNW)
    expect(cornerPiece(CORNERS[3], false, false, true)).toBe(PIECE.convexSE)
  })

  it('lays a straight rim across whichever straight neighbour is missing', () => {
    const nw = CORNERS[0]
    expect(cornerPiece(nw, false, true, false)).toBe(PIECE.rimN)
    expect(cornerPiece(nw, true, false, false)).toBe(PIECE.rimW)

    const se = CORNERS[3]
    expect(cornerPiece(se, false, true, false)).toBe(PIECE.rimS)
    expect(cornerPiece(se, true, false, false)).toBe(PIECE.rimE)
  })

  it('wraps a notch when both straights are present but the diagonal is not', () => {
    expect(cornerPiece(CORNERS[0], true, true, false)).toBe(PIECE.concaveNW)
    expect(cornerPiece(CORNERS[1], true, true, false)).toBe(PIECE.concaveNE)
    expect(cornerPiece(CORNERS[2], true, true, false)).toBe(PIECE.concaveSW)
    expect(cornerPiece(CORNERS[3], true, true, false)).toBe(PIECE.concaveSE)
  })

  it('needs no rim when the corner is buried', () => {
    for (const corner of CORNERS) {
      expect(cornerPiece(corner, true, true, true)).toBe(PIECE.interior)
    }
  })

  it('only ever returns a piece the sheet actually holds', () => {
    for (const corner of CORNERS) {
      for (const vertical of [false, true]) {
        for (const horizontal of [false, true]) {
          for (const diagonal of [false, true]) {
            const piece = cornerPiece(corner, vertical, horizontal, diagonal)
            expect(piece).toBeGreaterThanOrEqual(0)
            expect(piece).toBeLessThan(PIECE_COUNT)
          }
        }
      }
    }
  })
})

describe('rimQuadrants', () => {
  it('needs nothing when the cell is surrounded', () => {
    expect(rimQuadrants(neighbourhood(ALL))).toBeNull()
  })

  it('turns four corners when the cell stands alone', () => {
    const quadrants = rimQuadrants(neighbourhood(0))
    expect(quadrants?.map(q => q.piece)).toEqual([
      PIECE.convexNW, PIECE.convexNE, PIECE.convexSW, PIECE.convexSE,
    ])
  })

  it('covers all four quadrants of the tile exactly once', () => {
    for (let mask = 0; mask < 256; mask++) {
      const quadrants = rimQuadrants(neighbourhood(mask))
      if (!quadrants) continue
      const seen = quadrants.map(q => `${q.qx},${q.qy}`).sort()
      expect(seen).toEqual(['0,0', '0,1', '1,0', '1,1'])
    }
  })

  it('resolves every one of the 256 neighbourhoods to real pieces', () => {
    for (let mask = 0; mask < 256; mask++) {
      const quadrants = rimQuadrants(neighbourhood(mask))
      if (mask === ALL) {
        expect(quadrants).toBeNull()
        continue
      }
      expect(quadrants).toHaveLength(4)
      for (const quadrant of quadrants!) {
        expect(quadrant.piece).toBeGreaterThanOrEqual(0)
        expect(quadrant.piece).toBeLessThan(PIECE_COUNT)
      }
    }
  })

  it('ignores the diagonals when a straight neighbour is already missing', () => {
    // The north neighbour is absent, so the two north corners lay a rim
    // whatever the diagonals do -- otherwise a lone diagonal would punch a
    // concave corner into a straight edge.
    const northMissing = ALL & ~(1 << 1)
    const withDiagonals = rimQuadrants(neighbourhood(northMissing))
    const withoutDiagonals = rimQuadrants(
      neighbourhood(northMissing & ~(1 << 0) & ~(1 << 2)),
    )
    expect(withDiagonals?.[0].piece).toBe(PIECE.rimN)
    expect(withDiagonals?.[1].piece).toBe(PIECE.rimN)
    expect(withoutDiagonals?.[0].piece).toBe(PIECE.rimN)
    expect(withoutDiagonals?.[1].piece).toBe(PIECE.rimN)
  })
})

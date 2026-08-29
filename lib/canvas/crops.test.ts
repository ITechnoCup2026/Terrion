import { describe, it, expect } from 'vitest'
import { cropCell, CROP_CELL, CROP_STAGES } from './crops'

describe('cropCell', () => {
  it('maps a row and stage to its cell in the sheet', () => {
    expect(cropCell(2, 3)).toEqual({ sx: 3 * CROP_CELL, sy: 2 * CROP_CELL, size: CROP_CELL })
  })

  it('clamps a stage past the last column', () => {
    expect(cropCell(1, 99).sx).toBe((CROP_STAGES - 1) * CROP_CELL)
  })

  it('clamps a negative stage to the first column', () => {
    expect(cropCell(1, -3).sx).toBe(0)
  })
})

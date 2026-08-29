import { describe, it, expect } from 'vitest'
import { GRID_STEP, snapToGrid } from './grid'

describe('snapToGrid', () => {
  it('snaps to the nearest quarter degree', () => {
    expect(GRID_STEP).toBe(0.25)
    expect(snapToGrid(-7.21, 107.80)).toEqual({ gridLat: -7.25, gridLng: 107.75 })
  })

  it('leaves an already-snapped coordinate alone', () => {
    expect(snapToGrid(-7.25, 107.75)).toEqual({ gridLat: -7.25, gridLng: 107.75 })
  })

  it('rounds a negative half away from zero, as the generated column does', () => {
    // plot.grid_lat is `round(lat / 0.25) * 0.25` in Postgres, where round() on
    // numeric goes half away from zero. Math.round goes half toward +infinity,
    // so it disagrees on every negative .125 boundary — and Java is all
    // negative latitude. A mismatch makes the weather join return nothing.
    expect(snapToGrid(-7.125, 0).gridLat).toBe(-7.25)
    expect(snapToGrid(-7.375, 0).gridLat).toBe(-7.5)
    expect(snapToGrid(-0.125, 0).gridLat).toBe(-0.25)
  })

  it('still rounds a positive half away from zero', () => {
    expect(snapToGrid(7.125, 0).gridLat).toBe(7.25)
    expect(snapToGrid(0.125, 0).gridLat).toBe(0.25)
  })

  it('never produces negative zero', () => {
    // Postgres numeric has no -0. Stringifying -0 into a query filter would
    // not match a stored 0.
    const { gridLat, gridLng } = snapToGrid(-0.1, -0.05)
    expect(Object.is(gridLat, 0)).toBe(true)
    expect(Object.is(gridLng, 0)).toBe(true)
  })
})

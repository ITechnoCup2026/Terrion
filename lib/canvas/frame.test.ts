import { describe, it, expect } from 'vitest'
import { frameFarm } from './frame'
import { MAX_SCALE, MIN_SCALE } from './view'

const CELL = 32

const frame = (over: Partial<Parameters<typeof frameFarm>[0]> = {}) => frameFarm({
  plotCols: 10, plotRows: 8, cellPx: CELL, width: 1500, height: 900, step: 0.5, ...over,
})

// The whole point: at the chosen camera, the generated world has to reach
// every edge of the viewport. Anything less is the white margin this replaces.
function coversViewport(f: ReturnType<typeof frameFarm>, plot: { cols: number; rows: number },
  size: { width: number; height: number }) {
  const worldW = (plot.cols + f.border * 2) * CELL * f.view.scale
  const worldH = (plot.rows + f.border * 2) * CELL * f.view.scale
  // The world's top-left in screen space, then its extent.
  const left = f.view.offsetX
  const top = f.view.offsetY
  return left <= 0 && top <= 0
    && left + worldW >= size.width
    && top + worldH >= size.height
}

describe('frameFarm', () => {
  it('generates enough world to cover the viewport', () => {
    const f = frame()
    expect(coversViewport(f, { cols: 10, rows: 8 }, { width: 1500, height: 900 })).toBe(true)
  })

  it('covers a very wide window too', () => {
    const size = { width: 3000, height: 800 }
    const f = frame(size)
    expect(coversViewport(f, { cols: 10, rows: 8 }, size)).toBe(true)
  })

  it('covers a tall narrow window', () => {
    const size = { width: 380, height: 900 }
    const f = frame({ ...size, margin: 2 })
    expect(coversViewport(f, { cols: 10, rows: 8 }, size)).toBe(true)
  })

  it('centres the plot, not the world', () => {
    const f = frame()
    const centreX = f.view.offsetX + (f.border + 5) * CELL * f.view.scale
    const centreY = f.view.offsetY + (f.border + 4) * CELL * f.view.scale
    expect(centreX).toBeCloseTo(750, 6)
    expect(centreY).toBeCloseTo(450, 6)
  })

  // The camera frames the field plus its margin. What the world contains
  // beyond that must not change how big the fence is drawn, or two plots of
  // the same size would look different sizes on the same screen.
  it('scales from the field, not from the generated world', () => {
    const narrow = frame({ width: 1500, height: 900 })
    const wide = frame({ width: 3000, height: 1800 })
    expect(wide.view.scale).toBeGreaterThanOrEqual(narrow.view.scale)
    // Same plot, same margin, same aspect -> the field is framed the same way.
    expect(frame({ width: 1500, height: 900 }).view.scale).toBe(narrow.view.scale)
  })

  it('never crops the framed field', () => {
    const f = frame()
    const framedW = (10 + 3 * 2) * CELL * f.view.scale
    const framedH = (8 + 3 * 2) * CELL * f.view.scale
    expect(framedW).toBeLessThanOrEqual(1500 + 1e-9)
    expect(framedH).toBeLessThanOrEqual(900 + 1e-9)
  })

  it('keeps the scale on a notch', () => {
    expect((frame().view.scale * 2) % 1).toBe(0)
    expect(frame({ step: 1 }).view.scale % 1).toBe(0)
  })

  it('stays inside the scale bounds', () => {
    expect(frame({ width: 60, height: 40 }).view.scale).toBe(MIN_SCALE)
    expect(frame({ plotCols: 1, plotRows: 1, width: 4000, height: 4000 }).view.scale)
      .toBe(MAX_SCALE)
  })

  it('never asks for less scenery than the margin', () => {
    expect(frame({ width: 200, height: 150 }).border).toBeGreaterThanOrEqual(3)
    expect(frame({ width: 200, height: 150, margin: 2 }).border).toBeGreaterThanOrEqual(2)
  })

  // A terrain canvas is border-dependent, and an unbounded border on a huge
  // window would ask for one too big to rasterise.
  it('caps how much world it will generate', () => {
    expect(frame({ width: 20000, height: 20000 }).border).toBeLessThanOrEqual(48)
  })

  it('is deterministic', () => {
    expect(frame()).toEqual(frame())
  })
})

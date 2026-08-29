import { describe, it, expect } from 'vitest'
import { INDONESIA_BBOX, fitViewBox, padBbox, project, unionBbox } from './projection'

describe('project', () => {
  it('maps longitude east and latitude down, as SVG expects', () => {
    // SVG y grows downward while latitude grows upward, so a point further
    // north must produce a SMALLER y. Getting this backwards renders Indonesia
    // upside down, which looks like a data problem rather than a sign error.
    const north = project([107, -6])
    const south = project([107, -8])
    expect(north.y).toBeLessThan(south.y)

    const west = project([100, -6])
    const east = project([120, -6])
    expect(west.x).toBeLessThan(east.x)
  })

  it('is linear in longitude', () => {
    const a = project([100, 0])
    const b = project([110, 0])
    const c = project([120, 0])
    expect(b.x - a.x).toBeCloseTo(c.x - b.x, 6)
  })
})

describe('fitViewBox', () => {
  it('produces a viewBox containing the whole bbox', () => {
    const vb = fitViewBox([107, -8, 109, -6], 1)
    const [x, y, w, h] = vb.split(' ').map(Number)
    const min = project([107, -6])
    const max = project([109, -8])
    expect(x).toBeLessThanOrEqual(min.x + 1e-6)
    expect(y).toBeLessThanOrEqual(min.y + 1e-6)
    expect(x + w).toBeGreaterThanOrEqual(max.x - 1e-6)
    expect(y + h).toBeGreaterThanOrEqual(max.y - 1e-6)
  })

  it('matches the requested aspect ratio, so nothing is stretched', () => {
    const [, , w, h] = fitViewBox([107, -8, 109, -6], 2).split(' ').map(Number)
    expect(w / h).toBeCloseTo(2, 5)
  })

  it('widens a tall box and heightens a wide one', () => {
    // A regency taller than it is wide must gain width, not lose height.
    const tall = fitViewBox([107, -10, 108, -4], 2).split(' ').map(Number)
    const projected = project([108, -4]).x - project([107, -4]).x
    expect(tall[2]).toBeGreaterThan(projected)
  })

  it('never returns a zero-sized box for a degenerate bbox', () => {
    // A single-point bbox is reachable: a cooperative with one plot.
    const [, , w, h] = fitViewBox([107, -6, 107, -6], 1).split(' ').map(Number)
    expect(w).toBeGreaterThan(0)
    expect(h).toBeGreaterThan(0)
  })
})

describe('padBbox', () => {
  it('grows the box on every side', () => {
    const [minLng, minLat, maxLng, maxLat] = padBbox([100, -5, 102, -3], 0.1)
    expect(minLng).toBeLessThan(100)
    expect(minLat).toBeLessThan(-5)
    expect(maxLng).toBeGreaterThan(102)
    expect(maxLat).toBeGreaterThan(-3)
  })

  it('keeps the centre where it was', () => {
    const [minLng, , maxLng] = padBbox([100, -5, 102, -3], 0.25)
    expect((minLng + maxLng) / 2).toBeCloseTo(101, 6)
  })
})

describe('unionBbox', () => {
  it('covers both inputs', () => {
    expect(unionBbox([0, 0, 1, 1], [2, 2, 3, 3])).toEqual([0, 0, 3, 3])
  })

  it('returns the other box when one is empty', () => {
    expect(unionBbox(null, [2, 2, 3, 3])).toEqual([2, 2, 3, 3])
  })
})

describe('INDONESIA_BBOX', () => {
  it('contains Kab. Subang, where the demo cooperative sits', () => {
    const [minLng, minLat, maxLng, maxLat] = INDONESIA_BBOX
    expect(107.5294).toBeGreaterThan(minLng)
    expect(107.9233).toBeLessThan(maxLng)
    expect(-6.8128).toBeGreaterThan(minLat)
    expect(-6.1848).toBeLessThan(maxLat)
  })
})

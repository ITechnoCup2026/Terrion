import { describe, it, expect } from 'vitest'
import {
  MIN_SPAN, WORLD, clampView, formatView, panBy, parseView, wheelFactor, zoomAt,
} from './camera'

// A view sitting comfortably inside the world, so clamping is not what is
// being measured unless a test says so.
const inner = { x: WORLD.x + 5, y: WORLD.y + 3, w: 10, h: 6 }

describe('parseView / formatView', () => {
  it('round-trips', () => {
    const view = { x: 99.5, y: -3.89, w: 10, h: 6 }
    expect(parseView(formatView(view))).toEqual(view)
  })

  // Six decimals is well under a metre at this scale, and the attribute is
  // rewritten on every animation frame -- a raw float would make it forty
  // characters long.
  it('rounds off float noise rather than serialising it', () => {
    expect(formatView({ x: 0.1 + 0.2, y: 0, w: 1, h: 1 })).toBe('0.3 0 1 1')
  })

  it('reads the space-separated form SVG uses', () => {
    expect(parseView('1 2 3 4')).toEqual({ x: 1, y: 2, w: 3, h: 4 })
  })
})

describe('wheelFactor', () => {
  it('shrinks the view when scrolling up and grows it when scrolling down', () => {
    expect(wheelFactor(-100)).toBeLessThan(1)
    expect(wheelFactor(100)).toBeGreaterThan(1)
  })

  it('does nothing for no movement', () => {
    expect(wheelFactor(0)).toBe(1)
  })

  // One fling event can carry a delta of several hundred; without a clamp it
  // would cross the whole zoom range in a single frame.
  it('clamps a huge delta to the same factor as a large one', () => {
    expect(wheelFactor(5000)).toBe(wheelFactor(100))
  })
})

describe('zoomAt', () => {
  // The contract. Everything else in the camera follows from holding it.
  it('keeps the point under the cursor under the cursor', () => {
    const fx = 0.3, fy = 0.7
    const before = { x: inner.x + inner.w * fx, y: inner.y + inner.h * fy }
    const after = zoomAt(inner, 0.5, fx, fy)
    expect(after.x + after.w * fx).toBeCloseTo(before.x, 9)
    expect(after.y + after.h * fy).toBeCloseTo(before.y, 9)
  })

  it('preserves the aspect ratio', () => {
    const after = zoomAt(inner, 0.4, 0.5, 0.5)
    expect(after.w / after.h).toBeCloseTo(inner.w / inner.h, 9)
  })

  it('will not zoom past the closest span', () => {
    let view = inner
    for (let i = 0; i < 200; i++) view = zoomAt(view, 0.7, 0.5, 0.5)
    expect(view.w).toBeCloseTo(MIN_SPAN, 9)
  })

  it('will not zoom out past the whole country', () => {
    let view = inner
    for (let i = 0; i < 200; i++) view = zoomAt(view, 1.4, 0.5, 0.5)
    expect(view.w).toBeLessThanOrEqual(Math.max(WORLD.w, WORLD.h) + 1e-9)
  })
})

describe('panBy', () => {
  it('moves against the drag, so the map follows the hand', () => {
    const after = panBy(inner, 0.1, 0)
    expect(after.x).toBeLessThan(inner.x)
  })

  it('moves the same screen distance at any zoom', () => {
    const close = { ...inner, w: 1, h: 0.6 }
    expect((inner.x - panBy(inner, 0.1, 0).x) / inner.w)
      .toBeCloseTo((close.x - panBy(close, 0.1, 0).x) / close.w, 9)
  })

  it('never leaves the country', () => {
    let view = inner
    for (let i = 0; i < 100; i++) view = panBy(view, 0.5, 0.5)
    expect(view.x).toBeGreaterThanOrEqual(WORLD.x - 1e-9)
    expect(view.y).toBeGreaterThanOrEqual(WORLD.y - 1e-9)
  })
})

describe('clampView', () => {
  it('leaves a view that is already inside alone', () => {
    expect(clampView(inner)).toEqual(inner)
  })

  it('pulls a view back over the edge', () => {
    expect(clampView({ ...inner, x: WORLD.x - 50 }).x).toBeCloseTo(WORLD.x, 9)
  })

  // Pinned to the left margin with empty space on the right looks broken, and
  // there is no reading of "clamp" that makes it right.
  it('centres a view wider than the world instead of pinning it', () => {
    const wide = { x: -999, y: inner.y, w: WORLD.w * 2, h: inner.h }
    const clamped = clampView(wide)
    expect(clamped.x + clamped.w / 2).toBeCloseTo(WORLD.x + WORLD.w / 2, 9)
  })
})

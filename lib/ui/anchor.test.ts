import { describe, expect, it } from 'vitest'

import { placeAnchored } from './anchor'

// A 1000x800 window and a 200x120 panel, unless a test says otherwise.
const VIEWPORT = { width: 1000, height: 800 }
const PANEL = { width: 200, height: 120 }

describe('placeAnchored', () => {
  it('opens below and to the right of the pointer by default', () => {
    const p = placeAnchored({ x: 300, y: 200 }, PANEL, VIEWPORT, { gap: 12 })
    expect(p).toEqual({ x: 312, y: 212, side: 'bottom' })
  })

  it('flips left when it would run off the right edge', () => {
    const p = placeAnchored({ x: 950, y: 200 }, PANEL, VIEWPORT, { gap: 12 })
    // 950 + 12 + 200 = 1162 > 1000, so the panel goes to the pointer's left.
    expect(p.x).toBe(950 - 12 - 200)
    expect(p.side).toBe('bottom')
  })

  it('flips above when it would run off the bottom edge', () => {
    const p = placeAnchored({ x: 300, y: 760 }, PANEL, VIEWPORT, { gap: 12 })
    expect(p.y).toBe(760 - 12 - 120)
    expect(p.side).toBe('top')
  })

  it('flips on both axes at once in the far corner', () => {
    const p = placeAnchored({ x: 980, y: 780 }, PANEL, VIEWPORT, { gap: 12 })
    expect(p).toEqual({ x: 980 - 12 - 200, y: 780 - 12 - 120, side: 'top' })
  })

  it('keeps a margin from the edge rather than sitting flush against it', () => {
    // Anchored hard against the left: flipping is no help, so it clamps.
    const p = placeAnchored({ x: 2, y: 400 }, PANEL, VIEWPORT, { gap: 12, margin: 8 })
    expect(p.x).toBe(14)          // 2 + 12, already past the 8px margin
    const q = placeAnchored({ x: -40, y: 400 }, PANEL, VIEWPORT, { gap: 12, margin: 8 })
    expect(q.x).toBe(8)           // clamped to the margin
  })

  it('clamps rather than overflowing when the panel is taller than the viewport', () => {
    const tall = { width: 200, height: 900 }
    const p = placeAnchored({ x: 300, y: 400 }, tall, { width: 1000, height: 800 }, { margin: 8 })
    expect(p.y).toBe(8)
    // No placement fits, so it must still land inside on the axis it can.
    expect(p.x).toBeGreaterThanOrEqual(8)
  })

  it('never returns a position that puts the panel outside the viewport', () => {
    // A sweep, because the interesting failures are at the corners and the
    // flip boundaries rather than anywhere a hand-written case would land.
    for (let x = -20; x <= 1020; x += 20) {
      for (let y = -20; y <= 820; y += 20) {
        const p = placeAnchored({ x, y }, PANEL, VIEWPORT, { gap: 12, margin: 8 })
        expect(p.x).toBeGreaterThanOrEqual(8)
        expect(p.y).toBeGreaterThanOrEqual(8)
        expect(p.x + PANEL.width).toBeLessThanOrEqual(VIEWPORT.width - 8)
        expect(p.y + PANEL.height).toBeLessThanOrEqual(VIEWPORT.height - 8)
      }
    }
  })

  it('does not cover the point it is describing when there is room', () => {
    // The whole reason the panel is offset by a gap: clicking a crop tile must
    // leave that tile visible, or the popup is answering a question about
    // something it is standing on.
    const p = placeAnchored({ x: 300, y: 200 }, PANEL, VIEWPORT, { gap: 12 })
    const covers =
      300 >= p.x && 300 <= p.x + PANEL.width &&
      200 >= p.y && 200 <= p.y + PANEL.height
    expect(covers).toBe(false)
  })
})

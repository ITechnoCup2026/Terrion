import { describe, it, expect } from 'vitest'
import {
  clampOffset, clampView, coverScale, fitView, minScaleFor, snapScale, pinchScale,
  scaleStep, MIN_SCALE, MAX_SCALE,
  type View,
} from './view'

describe('scaleStep', () => {
  it('allows halves only where they land on whole device pixels', () => {
    expect(scaleStep(2)).toBe(0.5)
    expect(scaleStep(3)).toBe(0.5)
  })

  it('holds to integers on a low-density screen', () => {
    // 1.5x of a 32px sprite is 48 physical pixels at dpr 1, so every source
    // pixel straddles one and a half of them and the plants crawl.
    expect(scaleStep(1)).toBe(1)
  })
})

describe('snapScale', () => {
  it('snaps to an integer scale by default', () => {
    expect(snapScale(1.8)).toBe(2)
    expect(snapScale(2.2)).toBe(2)
  })

  it('snaps to halves when the step allows it', () => {
    expect(snapScale(2.4, 0.5)).toBe(2.5)
    expect(snapScale(2.2, 0.5)).toBe(2)
    expect(snapScale(1.75, 0.5)).toBe(2)
  })

  it('clamps to the scale bounds', () => {
    expect(snapScale(0.1)).toBe(MIN_SCALE)
    expect(snapScale(99)).toBe(MAX_SCALE)
    expect(snapScale(0.1, 0.5)).toBe(MIN_SCALE)
    expect(snapScale(99, 0.5)).toBe(MAX_SCALE)
  })
})

describe('fitView', () => {
  it('returns a scale on the notch it was given', () => {
    expect(fitView(14, 10, 32, 900, 600).scale % 1).toBe(0)
    expect((fitView(14, 10, 32, 900, 600, 0.5).scale * 2) % 1).toBe(0)
  })

  it('keeps the whole grid inside the viewport', () => {
    for (const step of [1, 0.5]) {
      const view = fitView(14, 10, 32, 900, 600, step)
      expect(14 * 32 * view.scale).toBeLessThanOrEqual(900)
      expect(10 * 32 * view.scale).toBeLessThanOrEqual(600)
    }
  })

  it('centres the grid in the viewport', () => {
    const view = fitView(14, 10, 32, 900, 600)
    expect(view.offsetX).toBeCloseTo((900 - 14 * 32 * view.scale) / 2)
    expect(view.offsetY).toBeCloseTo((600 - 10 * 32 * view.scale) / 2)
  })

  it('never drops below the minimum scale, even when the grid cannot fit', () => {
    expect(fitView(200, 200, 32, 320, 240).scale).toBe(MIN_SCALE)
    expect(fitView(200, 200, 32, 320, 240, 0.5).scale).toBe(MIN_SCALE)
  })

  it('scales up a small grid in a large viewport', () => {
    expect(fitView(4, 4, 32, 1280, 1024).scale).toBeGreaterThan(1)
  })

  // Half steps buy a notch exactly when the best fit lands past .5, which is
  // half of all plot shapes. A 12x10 grid at 32px is 384x320; in 1500x900 the
  // best fit is 2.8, so integers throw away 0.8 of it and halves keep 0.5.
  //
  // Worth being accurate about what this is worth: it is a second-order gain.
  // The farm was drawn at 1x not because of rounding but because the canvas
  // was never given the height -- it sat in a padded box inside a scrolling
  // page. Fix that and the same plot fits at 2 on integers alone. This is the
  // notch on top.
  it('uses a half step to fill more of the screen than integers can', () => {
    const integer = fitView(12, 10, 32, 1500, 900, 1)
    const halved = fitView(12, 10, 32, 1500, 900, 0.5)
    expect(integer.scale).toBe(2)
    expect(halved.scale).toBe(2.5)
    // Still fits, which is the constraint the extra reach must not break.
    expect(12 * 32 * halved.scale).toBeLessThanOrEqual(1500)
    expect(10 * 32 * halved.scale).toBeLessThanOrEqual(900)
  })

  // The shape from the bug report, for the record: height binds at 2.008, so
  // halves and integers agree. The win here came entirely from the layout.
  it('agrees with integers when the fit is only just past a whole notch', () => {
    expect(fitView(16, 14, 32, 1500, 900, 1).scale).toBe(2)
    expect(fitView(16, 14, 32, 1500, 900, 0.5).scale).toBe(2)
  })
})

describe('pinchScale', () => {
  it('zooms in when the fingers spread apart', () => {
    expect(pinchScale(1, 100, 200)).toBe(2)
  })

  it('zooms out when the fingers come together', () => {
    expect(pinchScale(4, 200, 100)).toBe(2)
  })

  it('holds the scale for a gesture that barely moves', () => {
    expect(pinchScale(3, 200, 205)).toBe(3)
  })

  it('lands on halves when the step allows it', () => {
    expect(pinchScale(2, 100, 125, 0.5)).toBe(2.5)
  })

  it('stays within the scale bounds', () => {
    expect(pinchScale(4, 100, 900)).toBe(MAX_SCALE)
    expect(pinchScale(2, 900, 10)).toBe(MIN_SCALE)
  })

  // Two pointers landing on the same spot would otherwise divide by zero.
  it('survives a zero starting distance', () => {
    expect(pinchScale(2, 0, 150)).toBe(2)
  })
})

describe('clampOffset', () => {
  it('leaves the offset alone while the world still covers the viewport', () => {
    expect(clampOffset(-50, 1000, 900)).toBe(-50)
  })

  it('pulls the far edge back to the viewport edge, never leaving a gap', () => {
    expect(clampOffset(50, 1000, 900)).toBe(0)
    expect(clampOffset(-500, 1000, 900)).toBe(900 - 1000)
  })

  it('centres and locks a world smaller than the viewport', () => {
    expect(clampOffset(-999, 400, 900)).toBe((900 - 400) / 2)
    expect(clampOffset(999, 400, 900)).toBe((900 - 400) / 2)
  })
})

describe('clampView', () => {
  it('stops a drag from panning past the edge of the generated terrain', () => {
    // A 16x14 grid at 32px scale 2 is 1024x896 -- bigger than an 800x600
    // viewport, so a drag that tried to push it far off to one side must be
    // pulled back to the world's own edge rather than showing blank canvas.
    const dragged: View = { scale: 2, offsetX: 500, offsetY: -900 }
    const clamped = clampView(dragged, 16 * 32, 14 * 32, 800, 600)
    expect(clamped.offsetX).toBe(0)
    expect(clamped.offsetY).toBe(600 - 14 * 32 * 2)
  })
})

describe('coverScale', () => {
  it('is the ratio of the axis that falls short first', () => {
    // A wide viewport over a square world: width is the tighter constraint.
    expect(coverScale(1000, 1000, 2000, 1000)).toBe(2)
    expect(coverScale(1000, 1000, 1000, 3000)).toBe(3)
  })

  it('is 1 when the world has no size to cover with', () => {
    expect(coverScale(0, 0, 800, 600)).toBe(MIN_SCALE)
  })
})

describe('minScaleFor', () => {
  it('rounds up onto a notch, so zooming out can never uncover the world', () => {
    // Covering needs 1.2x; halves are the notch, so 1.5x is the first that works.
    expect(minScaleFor(1000, 1000, 1200, 1200, 0.5)).toBe(1.5)
    // Whole notches only: 2x.
    expect(minScaleFor(1000, 1000, 1200, 1200, 1)).toBe(2)
  })

  it('leaves a world that covers exactly where it is', () => {
    // The frame is built to cover exactly, so floating point must not nudge
    // the opening shot up a step.
    expect(minScaleFor(1000, 1000, 1000, 1000, 0.5)).toBe(1)
    expect(minScaleFor(640, 480, 1280, 960, 0.5)).toBe(2)
  })

  it('never falls below MIN_SCALE or climbs past MAX_SCALE', () => {
    expect(minScaleFor(10000, 10000, 100, 100, 1)).toBe(MIN_SCALE)
    expect(minScaleFor(10, 10, 5000, 5000, 1)).toBe(MAX_SCALE)
  })
})

describe('clampView zoom floor', () => {
  const world = { w: 1000, h: 1000 }

  it('refuses a scale that would show background around the world', () => {
    // 1x over a 1000px world in a 1500px viewport leaves 500px of nothing.
    const clamped = clampView(
      { scale: 1, offsetX: 0, offsetY: 0 }, world.w, world.h, 1500, 1500, 0.5)
    expect(clamped.scale).toBe(1.5)
  })

  it('leaves a scale that already covers alone', () => {
    const clamped = clampView(
      { scale: 3, offsetX: 0, offsetY: 0 }, world.w, world.h, 1500, 1500, 0.5)
    expect(clamped.scale).toBe(3)
  })

  it('pans against the clamped scale, not the one it was handed', () => {
    // At the floor the world exactly covers, so there is nowhere left to pan.
    const clamped = clampView(
      { scale: 1, offsetX: -400, offsetY: -400 }, world.w, world.h, 1500, 1500, 0.5)
    expect(clamped.scale).toBe(1.5)
    expect(clamped.offsetX).toBe(0)
    expect(clamped.offsetY).toBe(0)
  })
})

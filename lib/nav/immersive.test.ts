import { describe, expect, it } from 'vitest'

import { isImmersiveRoute } from './immersive'

describe('isImmersiveRoute', () => {
  it('claims one plot', () => {
    expect(isImmersiveRoute('/plots/e5971cff-8b73-4e0d-a609-a4525d68af04')).toBe(true)
  })

  it('claims the demo plot, which is the same canvas', () => {
    expect(isImmersiveRoute('/plots/demo')).toBe(true)
  })

  it('leaves the list alone', () => {
    expect(isImmersiveRoute('/plots')).toBe(false)
    expect(isImmersiveRoute('/plots/')).toBe(false)
  })

  it('leaves the registration form alone', () => {
    // The near-miss that matters: /plots/new is one segment deep, exactly like
    // a plot id, and it is a form that needs its padding and its scroll.
    expect(isImmersiveRoute('/plots/new')).toBe(false)
  })

  it('does not claim the other sections', () => {
    for (const path of ['/dashboard', '/purchases', '/purchases/rdkk', '/requests', '/']) {
      expect(isImmersiveRoute(path)).toBe(false)
    }
  })

  it('does not claim a path that merely shares the prefix', () => {
    expect(isImmersiveRoute('/plotsomething/abc')).toBe(false)
  })

  it('does not claim anything deeper, since nothing is routed there', () => {
    expect(isImmersiveRoute('/plots/abc/blocks')).toBe(false)
  })
})

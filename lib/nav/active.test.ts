import { describe, expect, it } from 'vitest'

import { isActivePath } from './active'

describe('isActivePath', () => {
  it('matches the exact path', () => {
    expect(isActivePath('/plots', '/plots')).toBe(true)
  })

  it('matches a child path', () => {
    expect(isActivePath('/plots/8f2c', '/plots')).toBe(true)
  })

  it('matches a deep child path', () => {
    expect(isActivePath('/plots/8f2c/blocks/A', '/plots')).toBe(true)
  })

  // The prefix trap: a plain startsWith would light up "Lahan" on /plotsomething.
  it('does not match a path that merely shares the prefix', () => {
    expect(isActivePath('/plotsomething', '/plots')).toBe(false)
  })

  it('does not match a sibling', () => {
    expect(isActivePath('/purchases', '/plots')).toBe(false)
  })

  it('ignores a trailing slash on the current path', () => {
    expect(isActivePath('/plots/', '/plots')).toBe(true)
  })

  it('does not let the root item claim every page', () => {
    expect(isActivePath('/plots', '/')).toBe(false)
    expect(isActivePath('/', '/')).toBe(true)
  })
})

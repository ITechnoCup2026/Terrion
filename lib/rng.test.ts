import { describe, it, expect } from 'vitest'
import { createRng } from './rng'

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(12345)
    const b = createRng(12345)
    const draw = (r: ReturnType<typeof createRng>) => Array.from({ length: 20 }, () => r.next())
    expect(draw(a)).toEqual(draw(b))
  })

  it('produces different sequences for different seeds', () => {
    const a = Array.from({ length: 20 }, () => createRng(1).next())
    const b = Array.from({ length: 20 }, () => createRng(2).next())
    expect(a).not.toEqual(b)
  })

  it('stays inside [0, 1)', () => {
    const r = createRng(7)
    for (let i = 0; i < 5000; i++) {
      const v = r.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('draws integers inclusive of both bounds', () => {
    const r = createRng(99)
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) seen.add(r.int(3, 6))
    expect([...seen].sort()).toEqual([3, 4, 5, 6])
  })

  it('picks only from the list it was given', () => {
    const r = createRng(4)
    const items = ['a', 'b', 'c']
    for (let i = 0; i < 200; i++) expect(items).toContain(r.pick(items))
  })

  it('centres normal draws on the requested mean', () => {
    const r = createRng(2026)
    const draws = Array.from({ length: 20_000 }, () => r.normal(10, 2))
    const mean = draws.reduce((s, x) => s + x, 0) / draws.length
    expect(mean).toBeCloseTo(10, 1)
  })

  it('never returns a degenerate state that repeats one value forever', () => {
    // A zero state kills xorshift: every subsequent draw is identical.
    const r = createRng(0)
    const first = r.next()
    expect(Array.from({ length: 10 }, () => r.next()).every(v => v === first)).toBe(false)
  })
})

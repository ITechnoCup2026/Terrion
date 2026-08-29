import { describe, expect, it } from 'vitest'

import { selectLeadCollision } from './lead'

const week = (id: string, tonnes: number, plotCount: number) => ({ id, tonnes, plotCount })

describe('selectLeadCollision', () => {
  it('returns null when nothing is flagged', () => {
    expect(selectLeadCollision([])).toBeNull()
  })

  // The point of the alert is a change the board can make. A single plot over
  // the threshold is a big plot, not a pile-up — there is nothing to stagger
  // it against, and "Geser tanam 1 blok" is not advice.
  it('prefers a multi-plot week over a heavier single-plot week', () => {
    const lead = selectLeadCollision([
      week('kentang', 44.7, 1),
      week('padi', 36.7, 20),
    ])
    expect(lead?.id).toBe('padi')
  })

  it('takes the heaviest week among the multi-plot ones', () => {
    const lead = selectLeadCollision([
      week('padi-late', 35.6, 20),
      week('padi-early', 36.7, 20),
      week('cabai', 15.8, 2),
    ])
    expect(lead?.id).toBe('padi-early')
  })

  it('falls back to a single-plot week when that is all there is', () => {
    const lead = selectLeadCollision([week('kentang', 44.7, 1), week('wortel', 15.2, 1)])
    expect(lead?.id).toBe('kentang')
  })

  it('breaks a tonnage tie by how many plots are involved', () => {
    const lead = selectLeadCollision([week('a', 20, 3), week('b', 20, 9)])
    expect(lead?.id).toBe('b')
  })

  it('treats two plots as enough to be a pile-up', () => {
    const lead = selectLeadCollision([week('single', 100, 1), week('pair', 10, 2)])
    expect(lead?.id).toBe('pair')
  })
})

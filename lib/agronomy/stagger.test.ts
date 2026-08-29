import { describe, it, expect } from 'vitest'
import { utcDate } from './dates'
import { planStagger } from './stagger'

const TODAY = utcDate('2026-08-27')

const block = (id: string, plantingDate: string) => ({
  blockId: id,
  plantingDate: utcDate(plantingDate),
})

describe('planStagger — what can actually be moved', () => {
  it('shifts a block that has not been planted yet', () => {
    const { shifts, refused } = planStagger({
      suggestion: { blockIds: ['b1'], shiftDays: 10 },
      blocks: [block('b1', '2026-09-10')],
      today: TODAY,
    })
    expect(refused).toEqual([])
    expect(shifts).toHaveLength(1)
    expect(shifts[0].blockId).toBe('b1')
    expect(shifts[0].originalDate).toEqual(utcDate('2026-09-10'))
    expect(shifts[0].shiftedDate).toEqual(utcDate('2026-09-20'))
  })

  it('refuses a block already in the ground', () => {
    // You cannot un-plant a field. Rewriting its planting date would not move a
    // harvest, it would only falsify the record the projection is built on.
    const { shifts, refused } = planStagger({
      suggestion: { blockIds: ['b1'], shiftDays: 10 },
      blocks: [block('b1', '2026-06-25')],
      today: TODAY,
    })
    expect(shifts).toEqual([])
    expect(refused).toEqual([{ blockId: 'b1', reason: 'already-planted' }])
  })

  it('treats a block planted today as already in the ground', () => {
    const { shifts, refused } = planStagger({
      suggestion: { blockIds: ['b1'], shiftDays: 7 },
      blocks: [block('b1', '2026-08-27')],
      today: TODAY,
    })
    expect(shifts).toEqual([])
    expect(refused).toEqual([{ blockId: 'b1', reason: 'already-planted' }])
  })

  it('refuses a negative shift that would land the planting in the past', () => {
    // SHIFT_CANDIDATES carries -7, -10 and -14, so this is reachable.
    const { shifts, refused } = planStagger({
      suggestion: { blockIds: ['b1'], shiftDays: -14 },
      blocks: [block('b1', '2026-09-02')],
      today: TODAY,
    })
    expect(shifts).toEqual([])
    expect(refused).toEqual([{ blockId: 'b1', reason: 'would-be-in-the-past' }])
  })

  it('allows a negative shift that still lands in the future', () => {
    const { shifts, refused } = planStagger({
      suggestion: { blockIds: ['b1'], shiftDays: -7 },
      blocks: [block('b1', '2026-09-20')],
      today: TODAY,
    })
    expect(refused).toEqual([])
    expect(shifts[0].shiftedDate).toEqual(utcDate('2026-09-13'))
  })
})

describe('planStagger — partial and empty cases', () => {
  it('moves what it can and reports what it cannot', () => {
    const { shifts, refused } = planStagger({
      suggestion: { blockIds: ['past', 'future'], shiftDays: 10 },
      blocks: [block('past', '2026-05-01'), block('future', '2026-10-01')],
      today: TODAY,
    })
    expect(shifts.map(s => s.blockId)).toEqual(['future'])
    expect(refused).toEqual([{ blockId: 'past', reason: 'already-planted' }])
  })

  it('ignores block ids the cooperative does not own', () => {
    // The suggestion is rebuilt server-side, but a block id arriving from a
    // form must never reach an update by being trusted here.
    const { shifts, refused } = planStagger({
      suggestion: { blockIds: ['b1', 'not-ours'], shiftDays: 10 },
      blocks: [block('b1', '2026-10-01')],
      today: TODAY,
    })
    expect(shifts.map(s => s.blockId)).toEqual(['b1'])
    expect(refused).toEqual([])
  })

  it('returns nothing for an empty suggestion', () => {
    const { shifts, refused } = planStagger({
      suggestion: { blockIds: [], shiftDays: 10 },
      blocks: [block('b1', '2026-10-01')],
      today: TODAY,
    })
    expect(shifts).toEqual([])
    expect(refused).toEqual([])
  })

  it('refuses a zero shift rather than logging a move that moved nothing', () => {
    const { shifts, refused } = planStagger({
      suggestion: { blockIds: ['b1'], shiftDays: 0 },
      blocks: [block('b1', '2026-10-01')],
      today: TODAY,
    })
    expect(shifts).toEqual([])
    expect(refused).toEqual([{ blockId: 'b1', reason: 'no-shift' }])
  })
})

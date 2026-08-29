import { describe, it, expect } from 'vitest'
import { blockLabel, planSplit, splitBlockSchema } from './block'

const valid = {
  blockId: '11111111-1111-4111-8111-111111111111',
  areaHa: 0.3,
  commodityId: '22222222-2222-4222-8222-222222222222',
  varietyId: '33333333-3333-4333-8333-333333333333',
  plantingDate: new Date('2026-05-01'),
}

describe('splitBlockSchema', () => {
  it('accepts a split', () => {
    expect(splitBlockSchema.parse(valid).areaHa).toBe(0.3)
  })

  it('coerces the strings a form submits', () => {
    const parsed = splitBlockSchema.parse({ ...valid, areaHa: '0.3', plantingDate: '2026-05-01' })
    expect(parsed.areaHa).toBe(0.3)
    expect(parsed.plantingDate).toBeInstanceOf(Date)
  })

  it('rejects a zero area in Indonesian', () => {
    const result = splitBlockSchema.safeParse({ ...valid, areaHa: 0 })
    expect(result.success).toBe(false)
    expect(result.error!.issues[0].message).toBe('Luas harus lebih dari 0')
  })
})

describe('blockLabel', () => {
  it('names blocks by letter', () => {
    expect(blockLabel(0)).toBe('BLOK A')
    expect(blockLabel(1)).toBe('BLOK B')
    expect(blockLabel(25)).toBe('BLOK Z')
  })

  it('falls back to a number when the alphabet runs out', () => {
    expect(blockLabel(26)).toBe('BLOK 27')
  })
})

describe('planSplit', () => {
  it('divides a block in two', () => {
    expect(planSplit(0.72, 0.3)).toEqual({ ok: true, keptHa: 0.42, takenHa: 0.3 })
  })

  // Area conservation: the plot's area is the sum of its blocks, so a split
  // that loses a hundredth of a hectare to float error moves the fence.
  //
  // The halves are what gets written, and the column is numeric(8,4), so the
  // property is that each half is exact at four decimals -- Postgres does the
  // adding. Summing them back in JavaScript would just re-create the float
  // error this rounding exists to remove.
  it('conserves the block area exactly', () => {
    const plan = planSplit(0.3, 0.1)
    expect(plan).toEqual({ ok: true, keptHa: 0.2, takenHa: 0.1 })
  })

  it('refuses to leave nothing behind', () => {
    const plan = planSplit(0.5, 0.5)
    expect(plan.ok).toBe(false)
    expect(!plan.ok && plan.refusal).toContain('0,49 ha')
  })

  it('refuses to take more than the block has', () => {
    expect(planSplit(0.5, 0.8).ok).toBe(false)
  })

  it('refuses a sliver too small to plant', () => {
    const plan = planSplit(0.72, 0.004)
    expect(plan.ok).toBe(false)
    expect(!plan.ok && plan.refusal).toContain('0,01 ha')
  })

  it('allows a split down to the minimum on both sides', () => {
    expect(planSplit(0.02, 0.01)).toEqual({ ok: true, keptHa: 0.01, takenHa: 0.01 })
  })
})

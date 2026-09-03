import { describe, expect, it } from 'vitest'

import { checkHarvest, recordHarvestSchema } from './harvest'

const planted = new Date('2026-06-01T00:00:00Z')
const today = new Date('2026-09-03T00:00:00Z')

describe('checkHarvest', () => {
  it('accepts a harvest between the planting date and today', () => {
    expect(checkHarvest({
      plantingDate: planted, harvestDate: new Date('2026-09-01T00:00:00Z'), today,
    })).toBeNull()
  })

  it('accepts a harvest on the planting date itself', () => {
    expect(checkHarvest({ plantingDate: planted, harvestDate: planted, today })).toBeNull()
  })

  it('accepts a harvest recorded on the day it happened', () => {
    expect(checkHarvest({ plantingDate: planted, harvestDate: today, today })).toBeNull()
  })

  it('refuses a harvest before the crop went in', () => {
    expect(checkHarvest({
      plantingDate: planted, harvestDate: new Date('2026-05-31T00:00:00Z'), today,
    })).toMatch(/sebelum tanggal tanam/)
  })

  it('refuses a harvest that has not happened yet', () => {
    expect(checkHarvest({
      plantingDate: planted, harvestDate: new Date('2026-09-04T00:00:00Z'), today,
    })).toMatch(/belum terjadi/)
  })

  it('refuses payment dated before the crop was cut', () => {
    expect(checkHarvest({
      plantingDate: planted,
      harvestDate: new Date('2026-09-01T00:00:00Z'),
      paymentDate: new Date('2026-08-20T00:00:00Z'),
      today,
    })).toMatch(/sebelum tanggal panen/)
  })

  it('accepts payment on the day of the harvest', () => {
    const day = new Date('2026-09-01T00:00:00Z')
    expect(checkHarvest({
      plantingDate: planted, harvestDate: day, paymentDate: day, today,
    })).toBeNull()
  })

  it('says nothing while the date is still empty', () => {
    expect(checkHarvest({ plantingDate: planted, harvestDate: null, today })).toBeNull()
  })
})

describe('recordHarvestSchema', () => {
  const base = {
    blockId: '3f4b1a2c-1111-4111-8111-111111111111',
    harvestDate: '2026-09-01',
    yieldKg: '7400',
  }

  it('coerces the numbers and dates a form hands it', () => {
    const parsed = recordHarvestSchema.parse(base)
    expect(parsed.yieldKg).toBe(7400)
    expect(parsed.harvestDate).toBeInstanceOf(Date)
  })

  it('treats untouched optional fields as absent rather than as zero', () => {
    // An untouched <input> submits '', and coercing that to 0 would record a
    // sale at nothing per kilo and average it into the price-vs-market figure.
    const parsed = recordHarvestSchema.parse({ ...base, pricePerKg: '', paymentDate: '' })
    expect(parsed.pricePerKg).toBeUndefined()
    expect(parsed.paymentDate).toBeUndefined()
  })

  it('keeps an optional price that was filled in', () => {
    expect(recordHarvestSchema.parse({ ...base, pricePerKg: '5200' }).pricePerKg).toBe(5200)
  })

  it('rejects a yield of zero or less', () => {
    expect(recordHarvestSchema.safeParse({ ...base, yieldKg: '0' }).success).toBe(false)
    expect(recordHarvestSchema.safeParse({ ...base, yieldKg: '-1' }).success).toBe(false)
  })

  it('rejects a negative price', () => {
    expect(recordHarvestSchema.safeParse({ ...base, pricePerKg: '-5' }).success).toBe(false)
  })
})

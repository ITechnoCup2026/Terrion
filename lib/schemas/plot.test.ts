import { describe, it, expect } from 'vitest'
import { createPlotSchema, plotAreaHa } from './plot'

const planting = {
  commodityId: '11111111-1111-4111-8111-111111111111',
  varietyId: '22222222-2222-4222-8222-222222222222',
  plantingDate: new Date('2026-03-01'),
  areaHa: 1.4,
}

const valid = {
  memberName: 'Pak Slamet',
  plotName: 'Sawah Utara',
  lat: -7.25,
  lng: 112.75,
  plantings: [planting],
}

// The form posts strings; every numeric and date field has to survive that.
const validRaw = {
  ...valid,
  lat: '-7.25',
  lng: '112.75',
  plantings: [{ ...planting, areaHa: '1.4', plantingDate: '2026-03-01' }],
}

describe('createPlotSchema', () => {
  it('accepts a complete plot', () => {
    expect(createPlotSchema.parse(valid)).toMatchObject({ plotName: 'Sawah Utara' })
  })

  it('coerces the strings a form submits', () => {
    const parsed = createPlotSchema.parse(validRaw)
    expect(parsed.plantings[0].areaHa).toBe(1.4)
    expect(parsed.lat).toBe(-7.25)
    expect(parsed.plantings[0].plantingDate).toBeInstanceOf(Date)
  })

  it('accepts several commodities on one plot', () => {
    const parsed = createPlotSchema.parse({
      ...valid,
      plantings: [
        { ...planting, areaHa: 0.3 },
        { ...planting, commodityId: '33333333-3333-4333-8333-333333333333', areaHa: 0.42 },
      ],
    })
    expect(parsed.plantings).toHaveLength(2)
  })

  it('rejects a plot with nothing planted on it', () => {
    const result = createPlotSchema.safeParse({ ...valid, plantings: [] })
    expect(result.success).toBe(false)
    expect(result.error!.issues[0].message).toBe('Isi minimal satu komoditas')
  })

  it('rejects a zero area in Indonesian', () => {
    const result = createPlotSchema.safeParse({
      ...valid, plantings: [{ ...planting, areaHa: 0 }],
    })
    expect(result.success).toBe(false)
    expect(result.error!.issues[0].message).toBe('Luas harus lebih dari 0')
  })

  it('rejects a negative area', () => {
    expect(createPlotSchema.safeParse({
      ...valid, plantings: [{ ...planting, areaHa: -3 }],
    }).success).toBe(false)
  })

  it('rejects a one-character farmer name', () => {
    const result = createPlotSchema.safeParse({ ...valid, memberName: 'A' })
    expect(result.success).toBe(false)
    expect(result.error!.issues[0].message).toBe('Nama petani minimal 2 karakter')
  })

  it('rejects an empty plot name', () => {
    const result = createPlotSchema.safeParse({ ...valid, plotName: '' })
    expect(result.success).toBe(false)
    expect(result.error!.issues[0].message).toBe('Nama lahan wajib diisi')
  })

  it('rejects a commodity that is not a uuid', () => {
    const result = createPlotSchema.safeParse({
      ...valid, plantings: [{ ...planting, commodityId: 'jagung' }],
    })
    expect(result.success).toBe(false)
    expect(result.error!.issues[0].message).toBe('Pilih komoditas')
  })

  // Indonesia's bounding box: a pin outside it is a mistake, not data.
  it('rejects coordinates outside Indonesia', () => {
    expect(createPlotSchema.safeParse({ ...valid, lat: 40 }).success).toBe(false)     // Europe
    expect(createPlotSchema.safeParse({ ...valid, lng: -74 }).success).toBe(false)    // New York
  })

  it('accepts the corners of the Indonesian bounding box', () => {
    expect(createPlotSchema.safeParse({ ...valid, lat: -11, lng: 95 }).success).toBe(true)
    expect(createPlotSchema.safeParse({ ...valid, lat: 6, lng: 141 }).success).toBe(true)
  })
})

describe('plotAreaHa', () => {
  it('is the sum of the plantings', () => {
    expect(plotAreaHa([{ areaHa: 0.3 }, { areaHa: 0.42 }])).toBe(0.72)
  })

  // The whole diagram rests on a block's tile count being its hectares, so a
  // float artefact in the plot total is not cosmetic.
  it('rounds to the four decimals the column stores', () => {
    expect(plotAreaHa([{ areaHa: 0.1 }, { areaHa: 0.2 }])).toBe(0.3)
  })

  it('is zero for nothing planted', () => {
    expect(plotAreaHa([])).toBe(0)
  })
})

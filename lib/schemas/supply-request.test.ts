import { describe, expect, it } from 'vitest'

import { DELIVERY_PREFERENCES } from '@/lib/catalog/copy'

import { createSupplyRequestSchema, respondToRequestSchema } from './supply-request'

const LISTING = '11111111-1111-1111-1111-111111111111--' +
  '22222222-2222-2222-2222-222222222222--2026-W37'

const valid = {
  listingId: LISTING,
  volumeTonnes: '12.5',
  deliveryPreference: 'ambil_di_koperasi',
  notes: 'Butuh kualitas premium.',
}

describe('createSupplyRequestSchema', () => {
  it('coerces the form string into a number', () => {
    expect(createSupplyRequestSchema.parse(valid).volumeTonnes).toBe(12.5)
  })

  it('rejects a volume of zero or less', () => {
    expect(() => createSupplyRequestSchema.parse({ ...valid, volumeTonnes: '0' })).toThrow()
    expect(() => createSupplyRequestSchema.parse({ ...valid, volumeTonnes: '-5' })).toThrow()
  })

  it('rejects an unknown delivery preference', () => {
    expect(() => createSupplyRequestSchema.parse({ ...valid, deliveryPreference: 'drone' }))
      .toThrow()
  })

  it('accepts a missing notes field', () => {
    const withoutNotes = {
      listingId: valid.listingId,
      volumeTonnes: valid.volumeTonnes,
      deliveryPreference: valid.deliveryPreference,
    }
    expect(createSupplyRequestSchema.parse(withoutNotes).notes).toBeUndefined()
  })

  // The delivery window belongs to the listing. A buyer who posts their own
  // window must not be able to smuggle it through the schema into the insert.
  it('drops a buyer-supplied window', () => {
    const parsed = createSupplyRequestSchema.parse({
      ...valid, windowStart: '2020-01-01', windowEnd: '2020-01-07', cooperativeId: 'x',
    })
    expect(parsed).not.toHaveProperty('windowStart')
    expect(parsed).not.toHaveProperty('windowEnd')
    expect(parsed).not.toHaveProperty('cooperativeId')
  })
})

describe('delivery preferences', () => {
  // The schema spells its options out to keep literal types, so something has
  // to catch the two lists drifting apart.
  it('match the options the form offers', () => {
    expect([...createSupplyRequestSchema.shape.deliveryPreference.options])
      .toEqual(DELIVERY_PREFERENCES.map(p => p.value))
  })
})

describe('respondToRequestSchema', () => {
  it('accepts the two decisions a cooperative can make', () => {
    const id = '33333333-3333-4333-8333-333333333333'
    expect(respondToRequestSchema.parse({ requestId: id, decision: 'accepted' }).decision)
      .toBe('accepted')
    expect(respondToRequestSchema.parse({ requestId: id, decision: 'declined' }).decision)
      .toBe('declined')
  })

  // A cooperative cannot withdraw on the buyer's behalf, and cannot un-answer.
  it('rejects any other decision', () => {
    const id = '33333333-3333-4333-8333-333333333333'
    expect(() => respondToRequestSchema.parse({ requestId: id, decision: 'withdrawn' })).toThrow()
    expect(() => respondToRequestSchema.parse({ requestId: id, decision: 'pending' })).toThrow()
  })
})

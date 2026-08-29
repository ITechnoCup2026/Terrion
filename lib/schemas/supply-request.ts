import { z } from 'zod'

// Shared by RequestForm and createSupplyRequest, so both agree on what a valid
// request is. Form fields arrive as strings, hence the coercion.
//
// Note what is absent: the cooperative, the commodity and the delivery window.
// Those come from the listing on the server. A buyer supplying their own window
// would be choosing a delivery date the cooperative never projected, so the
// schema gives them nowhere to put one -- Zod strips unknown keys by default.
export const createSupplyRequestSchema = z.object({
  listingId:    z.string().min(1, 'Listing tidak dikenali'),
  volumeTonnes: z.coerce.number().positive('Volume harus lebih dari 0').max(100000),
  // Spelled out rather than derived from DELIVERY_PREFERENCES, so the parsed
  // type stays a union of literals instead of widening to string. The test
  // keeps the two lists in step.
  deliveryPreference: z.enum(['antar_ke_gudang', 'ambil_di_koperasi', 'belum_ditentukan']),
  notes:        z.string().max(1000, 'Catatan maksimal 1000 karakter').optional(),
})

export type CreateSupplyRequestInput = z.infer<typeof createSupplyRequestSchema>

// A cooperative answers; it does not withdraw on the buyer's behalf, and it
// cannot move a request back to pending.
export const respondToRequestSchema = z.object({
  requestId: z.uuid(),
  decision:  z.enum(['accepted', 'declined']),
})

export type RespondToRequestInput = z.infer<typeof respondToRequestSchema>

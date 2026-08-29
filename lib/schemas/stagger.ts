import { z } from 'zod'

// Which pile-up the cooperative is answering — and nothing else.
//
// Note what is absent: the blocks to move and the number of days. Both are
// re-derived from the live projection inside the action. A form that could name
// its own block ids would be choosing which land to rewrite, and a form that
// could name its own shift would be choosing an answer the detector never gave.
export const applyStaggerSchema = z.object({
  isoWeek:     z.string().regex(/^\d{4}-W\d{2}$/, 'Minggu tidak dikenali'),
  commodityId: z.uuid(),
})

export type ApplyStaggerInput = z.infer<typeof applyStaggerSchema>

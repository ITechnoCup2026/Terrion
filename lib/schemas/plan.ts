import { z } from 'zod'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const objectiveSchema = z.enum(['aman', 'pendapatan', 'pasar'])

export const seasonSchema = z.object({
  seasonLabel: z.string().min(1, 'Nama musim wajib diisi.').max(60),
  seasonStart: z.string().regex(ISO_DATE, 'Tanggal mulai tidak dikenali.'),
  seasonEnd:   z.string().regex(ISO_DATE, 'Tanggal selesai tidak dikenali.'),
}).refine(v => v.seasonEnd > v.seasonStart, {
  message: 'Musim harus berakhir setelah ia dimulai.',
  path: ['seasonEnd'],
})

// Which of the three plans the pengurus chose -- and nothing else.
//
// Note what is absent: the plots, the varieties, the planting dates. All of
// them are re-derived server-side from the same deterministic search that
// produced the proposal. A form that could name its own plot ids would be
// choosing which land to rewrite, which is not what picking a plan means.
export const applyPlanSchema = z.object({
  seasonLabel: z.string().min(1).max(60),
  seasonStart: z.string().regex(ISO_DATE),
  seasonEnd:   z.string().regex(ISO_DATE),
  objective:   objectiveSchema,
})

export const cancelPlanSchema = z.object({ planId: z.uuid() })

export type ApplyPlanInput = z.infer<typeof applyPlanSchema>

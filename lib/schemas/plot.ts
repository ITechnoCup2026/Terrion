import { z } from 'zod'

/**
 * What a valid plot registration is. Shared by the form and the Server Action,
 * so both agree. Form fields arrive as strings, hence the coercion.
 *
 * A plot now carries a LIST of plantings rather than one commodity. A farmer
 * with carrots on one corner and rice on the rest was previously forced to
 * register two plots, which put one field on the map twice.
 *
 * Note what is NOT here: `areaHa`. The plot's area is the sum of its
 * plantings, derived below. Asking for the total and the parts separately
 * invites them to disagree, and the whole tile diagram rests on them agreeing
 * -- a block's tile count IS its hectares.
 */

/** The smallest planting worth recording: 0,01 ha is 100 m², one tile at the
 *  finest size the grid offers. Below that it would not render. */
export const MIN_PLANTING_HA = 0.01

const MAX_PLOT_HA = 1000

/** More than this in one plot is a data-entry accident, not a farm. */
export const MAX_PLANTINGS = 6

export const plantingSchema = z.object({
  commodityId:  z.uuid('Pilih komoditas'),
  varietyId:    z.uuid('Pilih varietas'),
  plantingDate: z.coerce.date(),
  areaHa:       z.coerce.number()
    .min(MIN_PLANTING_HA, 'Luas harus lebih dari 0')
    .max(MAX_PLOT_HA),
})

export type PlantingInput = z.infer<typeof plantingSchema>

/**
 * The plot's area: exactly the land planted on it.
 *
 * Rounded to the four decimals the `numeric(8,4)` column stores, so that
 * 0,3 + 0,42 arrives as 0,72 rather than 0,7200000000000001.
 */
export function plotAreaHa(plantings: { areaHa: number }[]): number {
  return Math.round(plantings.reduce((sum, p) => sum + p.areaHa, 0) * 1e4) / 1e4
}

export const createPlotSchema = z.object({
  memberName: z.string().min(2, 'Nama petani minimal 2 karakter'),
  plotName:   z.string().min(1, 'Nama lahan wajib diisi'),
  // Indonesia's bounding box — a pin outside it is a mistake, not data.
  lat:        z.coerce.number().min(-11).max(6),
  lng:        z.coerce.number().min(95).max(141),
  plantings:  z.array(plantingSchema)
    .min(1, 'Isi minimal satu komoditas')
    .max(MAX_PLANTINGS, `Maksimal ${MAX_PLANTINGS} komoditas dalam satu lahan`),
}).refine(v => plotAreaHa(v.plantings) <= MAX_PLOT_HA, {
  message: `Total luas tidak boleh lebih dari ${MAX_PLOT_HA} ha`,
  path: ['plantings'],
})

export type CreatePlotInput = z.infer<typeof createPlotSchema>

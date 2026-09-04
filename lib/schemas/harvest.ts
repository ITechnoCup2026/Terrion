import { z } from 'zod'

/**
 * Recording what actually came off a block.
 *
 * This is the entry the whole prediction side of the product has been reading
 * from and nobody could write. Until it existed the calibration table stayed
 * empty for ever, so every projection ran on the base model and a cooperative's
 * own harvests taught it nothing.
 *
 * The price and the payment date are optional on purpose. The crop leaves the
 * field before the buyer settles, and a required field there would be filled
 * with a guess -- which would then be averaged into the price-vs-market figure
 * on the dashboard as though somebody had measured it.
 */

/** An untouched optional field arrives as '' from a form, not as undefined. */
const blank = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value

export const recordHarvestSchema = z.object({
  blockId: z.uuid(),
  harvestDate: z.coerce.date('Isi tanggal panen'),
  yieldKg: z.coerce.number().positive('Hasil panen harus lebih dari 0'),
  pricePerKg: z.preprocess(
    blank,
    z.coerce.number().min(0, 'Harga tidak boleh negatif').optional(),
  ),
  paymentDate: z.preprocess(blank, z.coerce.date().optional()),
})

export type RecordHarvestInput = z.infer<typeof recordHarvestSchema>

/**
 * The rules that need more than one date to check.
 *
 * Kept out of the schema because every one of them compares the entry against
 * the block it is being recorded on, which the schema does not have. Exported
 * so the form can refuse before submitting and the reader is not told what is
 * wrong only after a round trip -- the same arrangement `planSplit` has.
 *
 * Returns the refusal, or null when the entry is consistent.
 */
export function checkHarvest(input: {
  plantingDate: Date
  harvestDate: Date | null
  paymentDate?: Date | null
  today?: Date
}): string | null {
  const { plantingDate, harvestDate } = input
  if (!harvestDate || Number.isNaN(harvestDate.getTime())) return null

  const today = input.today ?? new Date()

  if (harvestDate < startOfDay(plantingDate)) {
    return 'Tanggal panen tidak boleh sebelum tanggal tanam.'
  }
  if (harvestDate > endOfDay(today)) {
    return 'Tanggal panen belum terjadi. Catat setelah panen selesai.'
  }
  if (input.paymentDate && !Number.isNaN(input.paymentDate.getTime())
      && input.paymentDate < startOfDay(harvestDate)) {
    return 'Tanggal pembayaran tidak boleh sebelum tanggal panen.'
  }
  return null
}

// Dates arrive from <input type="date"> at UTC midnight; a planting or harvest
// date is a day, not an instant, so both ends are compared as whole days.
function startOfDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function endOfDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
}

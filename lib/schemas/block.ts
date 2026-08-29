import { z } from 'zod'

import { MIN_PLANTING_HA } from './plot'

/**
 * Splitting a standing block in two.
 *
 * The second way to get more than one crop onto a plot. Registration takes
 * several commodities up front (see `createPlotSchema`); this is for the
 * farmer who decides in May that a third of the rice field is going to be
 * chilli.
 *
 * The arithmetic and the refusals live here rather than in the action so they
 * can be tested without a database, and so the two callers -- the action, and
 * the form that greys out its own button -- agree on what is possible.
 */

export const splitBlockSchema = z.object({
  blockId:      z.uuid(),
  /** Hectares carved OFF the existing block for the new crop. */
  areaHa:       z.coerce.number().min(MIN_PLANTING_HA, 'Luas harus lebih dari 0'),
  commodityId:  z.uuid('Pilih komoditas'),
  varietyId:    z.uuid('Pilih varietas'),
  plantingDate: z.coerce.date(),
})

export type SplitBlockInput = z.infer<typeof splitBlockSchema>

/**
 * A block's name from its position: BLOK A, BLOK B, … and BLOK 27 once the
 * alphabet is exhausted, which no real plot will reach.
 */
export function blockLabel(orderIndex: number): string {
  return orderIndex < 26
    ? `BLOK ${String.fromCharCode(65 + orderIndex)}`
    : `BLOK ${orderIndex + 1}`
}

/** How many hectares are left on a block after `takenHa` is carved off. */
export type SplitPlan =
  | { ok: true; keptHa: number; takenHa: number }
  | { ok: false; refusal: string }

const ha = (n: number) => n.toFixed(2).replace('.', ',')

/**
 * Works out the two areas, or says why the split cannot happen.
 *
 * Both halves have to remain plantable. A split that leaves 0,004 ha behind
 * has not divided a field, it has rounded one away -- and the tile grid, which
 * draws a block as its own rectangle, would have nothing to draw.
 *
 * Rounded to the four decimals the column stores, so the two halves still sum
 * to the original and the plot's area stays the sum of its blocks.
 */
export function planSplit(blockAreaHa: number, takenHa: number): SplitPlan {
  const round = (n: number) => Math.round(n * 1e4) / 1e4
  const taken = round(takenHa)
  const kept = round(blockAreaHa - taken)

  if (taken < MIN_PLANTING_HA) {
    return { ok: false, refusal: `Luas tanam baru minimal ${ha(MIN_PLANTING_HA)} ha.` }
  }
  if (kept < MIN_PLANTING_HA) {
    return {
      ok: false,
      refusal: `Blok ini hanya ${ha(blockAreaHa)} ha. Sisakan minimal `
        + `${ha(MIN_PLANTING_HA)} ha untuk tanaman yang sudah ada — `
        + `maksimal ${ha(round(blockAreaHa - MIN_PLANTING_HA))} ha bisa dipecah.`,
    }
  }
  return { ok: true, keptHa: kept, takenHa: taken }
}

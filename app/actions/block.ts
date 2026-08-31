'use server'

import { toISODate } from '@/lib/agronomy/dates'
import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { apiFetch, ApiError } from '@/lib/api/client'
import type {
  SplitBelowMinimumData,
  SplitBlockResponseRaw,
  SplitLeavesTooLittleData,
} from '@/lib/api/types'
import { currentAccessToken, requireRole } from '@/lib/auth/session'
import { splitBlockSchema } from '@/lib/schemas/block'

const ha = (n: number) => n.toFixed(2).replace('.', ',')

export async function splitBlock(
  raw: unknown,
): Promise<ActionResult<{ plotId: string; blockId: string }>> {
  return attempt(async () => {
    await requireRole(['kader', 'pengurus'])
    const parsed = splitBlockSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ExpectedFailure(parsed.error.issues[0]?.message ?? 'Isian tidak valid.')
    }
    const { blockId, areaHa, commodityId, varietyId, plantingDate } = parsed.data
    const token = await currentAccessToken()

    try {
      const result = await apiFetch<SplitBlockResponseRaw>(`/api/blocks/${blockId}/split`, {
        method: 'POST',
        accessToken: token,
        body: {
          area_ha: areaHa,
          commodity_id: commodityId,
          variety_id: varietyId,
          planting_date: toISODate(plantingDate),
        },
      })
      return { plotId: result.plot_id, blockId: result.block_id }
    } catch (error) {
      if (error instanceof ApiError) {
        // Same refusal text planSplit() already gives the form, so a
        // server-confirmed rejection reads identically to a predicted one.
        if (error.code === 'split_block_already_gone') {
          throw new ExpectedFailure('Blok ini sudah tidak ada, atau bukan milik koperasi Anda.')
        }
        if (error.code === 'split_block_harvested') {
          throw new ExpectedFailure('Blok ini sudah dipanen. Daftarkan tanam baru lewat lahan.')
        }
        if (error.code === 'split_below_minimum') {
          const data = error.data as SplitBelowMinimumData
          throw new ExpectedFailure(`Luas tanam baru minimal ${ha(data.min_ha)} ha.`)
        }
        if (error.code === 'split_leaves_too_little') {
          const data = error.data as SplitLeavesTooLittleData
          throw new ExpectedFailure(
            `Blok ini hanya ${ha(data.block_area_ha)} ha. Sisakan minimal `
              + `${ha(data.min_ha)} ha untuk tanaman yang sudah ada — `
              + `maksimal ${ha(data.max_takeable_ha)} ha bisa dipecah.`,
          )
        }
      }
      throw error
    }
  })
}

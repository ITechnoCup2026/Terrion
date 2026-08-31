'use server'

import { toISODate } from '@/lib/agronomy/dates'
import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { apiFetch, ApiError } from '@/lib/api/client'
import type { CreatePlotResponseRaw } from '@/lib/api/types'
import { currentAccessToken, requireRole } from '@/lib/auth/session'
import { createPlotSchema } from '@/lib/schemas/plot'

export async function createPlot(raw: unknown): Promise<ActionResult<{ plotId: string; publicId: string }>> {
  return attempt(async () => {
    await requireRole(['kader', 'pengurus'])
    const parsed = createPlotSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ExpectedFailure(parsed.error.issues[0]?.message ?? 'Isian tidak valid.')
    }
    const { memberName, plotName, lat, lng, plantings } = parsed.data
    const token = await currentAccessToken()

    try {
      const result = await apiFetch<CreatePlotResponseRaw>('/api/plots', {
        method: 'POST',
        accessToken: token,
        body: {
          member_name: memberName,
          plot_name: plotName,
          lat,
          lng,
          plantings: plantings.map(p => ({
            commodity_id: p.commodityId,
            variety_id: p.varietyId,
            planting_date: toISODate(p.plantingDate),
            area_ha: p.areaHa,
          })),
        },
      })
      return { plotId: result.plot_id, publicId: result.public_id }
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        throw new ExpectedFailure('Isian tidak valid, atau total luas lahan terlalu besar.')
      }
      throw error
    }
  })
}

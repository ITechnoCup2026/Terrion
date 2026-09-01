'use server'

import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { apiFetch, ApiError } from '@/lib/api/client'
import type { StaggerNothingToShiftData, StaggerResponseRaw } from '@/lib/api/types'
import { currentSessionId, requireRole } from '@/lib/auth/session'
import { applyStaggerSchema } from '@/lib/schemas/stagger'

export async function applyStagger(raw: unknown): Promise<ActionResult<{ shifted: number }>> {
  return attempt(async () => {
    await requireRole(['pengurus'])
    const parsed = applyStaggerSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ExpectedFailure(parsed.error.issues[0]?.message ?? 'Isian tidak valid.')
    }
    const { isoWeek, commodityId } = parsed.data
    const sessionId = await currentSessionId()

    try {
      const result = await apiFetch<StaggerResponseRaw>('/api/stagger', {
        method: 'POST',
        sessionId,
        body: { iso_week: isoWeek, commodity_id: commodityId },
      })
      return { shifted: result.shifted }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'stagger_suggestion_stale') {
          throw new ExpectedFailure(
            'Saran untuk minggu ini sudah tidak berlaku. Muat ulang dasbor untuk melihat saran terbaru.',
          )
        }
        if (error.code === 'stagger_nothing_to_shift') {
          const data = error.data as StaggerNothingToShiftData
          throw new ExpectedFailure(
            data.already_planted > 0
              ? 'Semua blok pada minggu ini sudah ditanam, jadi tidak ada yang bisa digeser.'
              : 'Tidak ada blok yang bisa digeser tanpa jatuh ke tanggal yang sudah lewat.',
          )
        }
      }
      throw error
    }
  })
}

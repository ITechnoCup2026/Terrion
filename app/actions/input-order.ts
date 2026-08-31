'use server'

import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { apiFetch, ApiError } from '@/lib/api/client'
import type { CreateInputOrderResponseRaw } from '@/lib/api/types'
import { currentAccessToken, requireRole } from '@/lib/auth/session'

export async function createInputOrder(): Promise<ActionResult<{ orderId: string; lines: number }>> {
  return attempt(async () => {
    await requireRole(['pengurus'])
    const token = await currentAccessToken()

    try {
      const result = await apiFetch<CreateInputOrderResponseRaw>('/api/input-orders', {
        method: 'POST',
        accessToken: token,
      })
      return { orderId: result.order_id, lines: result.lines }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'rdkk_nothing_to_order') {
        throw new ExpectedFailure('Tidak ada kebutuhan pupuk untuk dipesan musim ini.')
      }
      throw error
    }
  })
}

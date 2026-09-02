'use server'

import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { apiFetch, ApiError } from '@/lib/api/client'
import type { SupplyRequestRaw } from '@/lib/api/types'
import { currentSessionId, requireRole } from '@/lib/auth/session'
import { createSupplyRequestSchema, respondToRequestSchema } from '@/lib/schemas/supply-request'

export async function createSupplyRequest(
  raw: unknown,
): Promise<ActionResult<{ requestId: string }>> {
  return attempt(async () => {
    await requireRole(['buyer'])
    const parsed = createSupplyRequestSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ExpectedFailure(parsed.error.issues[0]?.message ?? 'Isian tidak valid.')
    }
    const { listingId, volumeTonnes, deliveryPreference, notes } = parsed.data
    const sessionId = await currentSessionId()

    try {
      const result = await apiFetch<SupplyRequestRaw>('/api/supply-requests', {
        method: 'POST',
        sessionId,
        body: {
          listing_id: listingId,
          volume_tonnes: volumeTonnes,
          delivery_preference: deliveryPreference,
          notes,
        },
      })
      return { requestId: result.id }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'listing_unknown') {
          throw new ExpectedFailure('Penawaran ini tidak dikenali. Muat ulang katalog dan coba lagi.')
        }
        if (error.code === 'listing_gone') {
          throw new ExpectedFailure('Penawaran ini sudah tidak tersedia. Muat ulang katalog untuk melihat yang terbaru.')
        }
      }
      throw error
    }
  })
}

export async function respondToRequest(raw: unknown): Promise<ActionResult<void>> {
  return attempt(async () => {
    await requireRole(['pengurus'])
    const parsed = respondToRequestSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ExpectedFailure(parsed.error.issues[0]?.message ?? 'Isian tidak valid.')
    }
    const { requestId, decision } = parsed.data
    const sessionId = await currentSessionId()

    try {
      await apiFetch<void>(`/api/supply-requests/${requestId}`, {
        method: 'PATCH',
        sessionId,
        body: { decision },
      })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'request_not_found') {
        throw new ExpectedFailure('Permintaan ini sudah tidak ada, atau bukan milik koperasi Anda.')
      }
      if (error instanceof ApiError && error.code === 'allocation_exceeded') {
        throw new ExpectedFailure(
          'Menerima permintaan ini akan membuat total tonase yang diterima melebihi proyeksi ' +
          'panen jendela ini. Tolak permintaan ini, atau tunggu proyeksi berikutnya.',
        )
      }
      throw error
    }
  })
}

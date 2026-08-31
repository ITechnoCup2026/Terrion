'use server'

import type { ActionResult } from '@/lib/actions/result'

/**
 * This repo has no backend attached. Kept as a stub, with the same signature
 * as the real action, so CreateOrderButton keeps working as UI -- it just
 * always gets told there is nowhere to save to.
 */
export async function createInputOrder(): Promise<ActionResult<{ orderId: string; lines: number }>> {
  return { ok: false, message: 'Belum ada backend yang terhubung untuk membuat pesanan.' }
}

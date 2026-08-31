'use server'

import type { ActionResult } from '@/lib/actions/result'

/**
 * This repo has no backend attached. Kept as a stub, with the same signature
 * as the real action, so ApplyStaggerButton keeps working as UI -- it just
 * always gets told there is nowhere to save to.
 */
export async function applyStagger(_raw: unknown): Promise<ActionResult<{ shifted: number }>> {
  return { ok: false, message: 'Belum ada backend yang terhubung untuk menerapkan ini.' }
}

'use server'

import type { ActionResult } from '@/lib/actions/result'

/**
 * This repo has no backend attached. Both kept as stubs, with the same
 * signatures as the real actions, so RequestForm and the requests inbox keep
 * working as UI -- they just always get told there is nowhere to save to.
 */
export async function createSupplyRequest(
  _raw: unknown,
): Promise<ActionResult<{ requestId: string }>> {
  return { ok: false, message: 'Belum ada backend yang terhubung untuk mengirim permintaan ini.' }
}

export async function respondToRequest(_raw: unknown): Promise<ActionResult<void>> {
  return { ok: false, message: 'Belum ada backend yang terhubung untuk menjawab permintaan ini.' }
}

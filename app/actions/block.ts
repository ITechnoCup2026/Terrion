'use server'

import type { ActionResult } from '@/lib/actions/result'

/**
 * This repo has no backend attached. Kept as a stub, with the same signature
 * as the real action, so SplitBlockForm keeps working as UI -- it just always
 * gets told there is nowhere to save to.
 */
export async function splitBlock(
  _raw: unknown,
): Promise<ActionResult<{ plotId: string; blockId: string }>> {
  return { ok: false, message: 'Belum ada backend yang terhubung untuk menyimpan ini.' }
}

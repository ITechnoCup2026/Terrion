'use server'

import { revalidatePath } from 'next/cache'

import { addDays } from '@/lib/agronomy/dates'
import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { requireRole } from '@/lib/auth/session'
import { loadSeasonInputs } from '@/lib/rdkk/load'
import { toOrderLines } from '@/lib/rdkk/order'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Records this season's aggregated fertiliser requirement as a group purchase.
 *
 * The quantities are re-derived from the season's recorded plantings rather
 * than accepted from the browser, so an order always matches the RDKK the
 * screen showed.
 *
 * It is written as a draft with no prices. Nothing in the schema supplies
 * fertiliser prices -- a supplier quotes them -- and inventing one would put a
 * fabricated saving on the dashboard. The impact figure counts only completed
 * orders with both a retail and a bulk price, so it correctly stays empty
 * until a real quote is recorded.
 */
export async function createInputOrder(): Promise<ActionResult<{ orderId: string; lines: number }>> {
  return attempt(() => createInputOrderBody())
}

// The body, kept separate so `attempt` can wrap it without this file's every
// line moving three spaces to the right.
async function createInputOrderBody(): Promise<{ orderId: string; lines: number }> {
  const user = await requireRole(['pengurus'])
  const cooperativeId = user.cooperative_id
  if (!cooperativeId) {
    throw new ExpectedFailure('Akun ini tidak terhubung ke koperasi mana pun.')
  }

  const now = new Date()
  const season = { label: 'musim ini', start: addDays(now, -365), end: now }
  const rdkk = await loadSeasonInputs(cooperativeId, season)
  const lines = toOrderLines(rdkk.totals)

  if (lines.length === 0) {
    throw new ExpectedFailure('Belum ada kebutuhan pupuk yang bisa dipesan musim ini.')
  }

  const db = await createServerClient()
  const { data: order, error: orderError } = await db.from('input_order')
    .insert({ cooperative_id: cooperativeId, season_label: season.label, status: 'draft' })
    .select('id').single()
  if (orderError || !order) {
    throw new Error(`Gagal membuat pesanan: ${orderError?.message ?? 'unknown'}`)
  }

  const { error: lineError } = await db.from('input_order_line').insert(
    lines.map(l => ({
      input_order_id: order.id,
      item: l.item,
      quantity: l.quantity,
      unit: l.unit,
      retail_price_per_unit: null,
      bulk_price_per_unit: null,
    })),
  )
  // A header with no lines is not a usable order, so it does not get to linger.
  if (lineError) {
    await db.from('input_order').delete().eq('id', order.id)
    throw new Error(`Gagal menyimpan rincian pesanan: ${lineError.message}`)
  }

  revalidatePath('/purchases')
  return { orderId: order.id, lines: lines.length }
}

'use server'

import { revalidatePath } from 'next/cache'

import { toISODate } from '@/lib/agronomy/dates'
import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { requireRole } from '@/lib/auth/session'
import { blockLabel, planSplit, splitBlockSchema } from '@/lib/schemas/block'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Splits a standing block in two and plants something else on the piece taken.
 *
 * The second way onto a multi-crop plot. Registration takes several
 * commodities up front; this is for the farmer who decides in May that a
 * third of the rice field is going to be chilli.
 *
 * The write goes through the RLS client on purpose: the `tenant_write` policy
 * on `block` is what actually stops one cooperative editing another's field,
 * and the requireRole below is the error message, not the lock.
 */
export async function splitBlock(
  raw: unknown,
): Promise<ActionResult<{ plotId: string; blockId: string }>> {
  return attempt(() => splitBlockBody(raw))
}

// The body, kept separate so `attempt` can wrap it without this file's every
// line moving three spaces to the right.
async function splitBlockBody(raw: unknown): Promise<{ plotId: string; blockId: string }> {
  const input = splitBlockSchema.parse(raw)
  await requireRole(['kader', 'pengurus'])

  const db = await createServerClient()

  // RLS scopes this to the viewer's cooperative, so another tenant's block id
  // reads back as absent -- which is the same sentence as a deleted one, and
  // deliberately so.
  const { data: block, error: blockError } = await db.from('block')
    .select('id, plot_id, area_ha, actual_harvest_date')
    .eq('id', input.blockId).maybeSingle()
  if (blockError) throw new Error(`Gagal membaca blok: ${blockError.message}`)
  if (!block) {
    throw new ExpectedFailure('Blok ini sudah tidak ada. Muat ulang halaman lahan.')
  }
  if (block.actual_harvest_date !== null) {
    throw new ExpectedFailure(
      'Blok ini sudah dipanen, jadi tidak bisa dipecah. '
      + 'Daftarkan tanam baru lewat lahan.')
  }

  const plan = planSplit(Number(block.area_ha), input.areaHa)
  if (!plan.ok) throw new ExpectedFailure(plan.refusal)

  // The new block goes after every block the plot already has, harvested ones
  // included: order_index is the block's position in the field, and reusing a
  // harvested season's slot would put two blocks on the same tiles.
  const { data: siblings, error: siblingError } = await db.from('block')
    .select('order_index').eq('plot_id', block.plot_id)
  if (siblingError) throw new Error(`Gagal membaca blok lain: ${siblingError.message}`)
  const nextIndex = Math.max(...(siblings ?? []).map(s => s.order_index), -1) + 1

  // Shrink first, then insert. Neither order is atomic over the REST API, so
  // pick the failure that is safe: shrink-then-fail leaves the plot with less
  // planted than its area, which draws as bare ground. Insert-then-fail would
  // leave the blocks claiming MORE land than the plot has, and the tile grid
  // cannot draw that at all.
  const { error: shrinkError } = await db.from('block')
    .update({ area_ha: plan.keptHa }).eq('id', block.id)
  if (shrinkError) throw new Error(`Gagal memperkecil blok: ${shrinkError.message}`)

  const { data: created, error: insertError } = await db.from('block').insert({
    plot_id: block.plot_id,
    label: blockLabel(nextIndex),
    area_ha: plan.takenHa,
    order_index: nextIndex,
    commodity_id: input.commodityId,
    variety_id: input.varietyId,
    planting_date: toISODate(input.plantingDate),
  }).select('id').single()
  if (insertError || !created) {
    // Put the hectares back rather than leaving the field short.
    await db.from('block').update({ area_ha: Number(block.area_ha) }).eq('id', block.id)
    throw new Error(`Gagal menyimpan blok baru: ${insertError?.message ?? 'unknown'}`)
  }

  revalidatePath(`/plots/${block.plot_id}`)
  revalidatePath('/plots')
  revalidatePath('/dashboard')
  return { plotId: block.plot_id, blockId: created.id }
}

'use server'

import { revalidatePath } from 'next/cache'

import { detectCollisions } from '@/lib/agronomy/collide'
import { toISODate, utcDate } from '@/lib/agronomy/dates'
import { projectCooperative } from '@/lib/agronomy/project'
import { planStagger, type ShiftCandidate } from '@/lib/agronomy/stagger'
import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { requireRole } from '@/lib/auth/session'
import { applyStaggerSchema } from '@/lib/schemas/stagger'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Accepts one staggering suggestion: moves the plantings it names and logs what
 * moved.
 *
 * The suggestion is rebuilt from the live projection rather than read from the
 * form, so the only thing the browser chooses is which flagged week it is
 * answering. Everything that decides which rows get written — the block ids and
 * the number of days — comes from `detectCollisions` on the server.
 *
 * Writes go through the RLS client on purpose. Applying a stagger commits the
 * cooperative, so it is the `tenant_write` and `coop_write` policies that
 * authorise it; the requireRole below is the error message, not the lock.
 *
 * The planting dates and the log are written together and describe the same
 * event. Impact figure 4 winds the log back to reconstruct the season that
 * would have happened, so a log entry without a matching date change would
 * invent a diversion nobody achieved.
 */
export async function applyStagger(raw: unknown): Promise<ActionResult<{ shifted: number }>> {
  return attempt(() => applyStaggerBody(raw))
}

// The body, kept separate so `attempt` can wrap it without this file's every
// line moving three spaces to the right.
async function applyStaggerBody(raw: unknown): Promise<{ shifted: number }> {
  const input = applyStaggerSchema.parse(raw)

  const user = await requireRole(['pengurus'])
  const cooperativeId = user.cooperative_id
  if (!cooperativeId) {
    throw new ExpectedFailure('Akun ini tidak terhubung ke koperasi mana pun.')
  }

  const db = await createServerClient()
  const now = new Date()

  const { projections } = await projectCooperative(cooperativeId, now)

  const { data: capacityRows } = await db
    .from('cooperative_capacity')
    .select('commodity_id, tonnes_per_week')
    .eq('cooperative_id', cooperativeId)
  const capacity = capacityRows?.length
    ? new Map(capacityRows.map(r => [r.commodity_id, Number(r.tonnes_per_week)]))
    : null

  const { suggestions } = detectCollisions(projections, capacity)
  const suggestion = suggestions.find(
    s => s.isoWeek === input.isoWeek && s.commodityId === input.commodityId)
  if (!suggestion) {
    throw new ExpectedFailure('Saran penggeseran ini sudah tidak berlaku. Muat ulang dasbor.')
  }

  // RLS scopes this to the cooperative, so a block id from another tenant reads
  // back as absent and planStagger drops it.
  const { data: blockRows, error: blockError } = await db
    .from('block')
    .select('id, planting_date')
    .in('id', suggestion.blockIds)
  if (blockError) throw new Error(`Gagal membaca blok: ${blockError.message}`)

  const blocks: ShiftCandidate[] = (blockRows ?? []).map(b => ({
    blockId: b.id,
    plantingDate: utcDate(b.planting_date),
  }))

  const { shifts, refused } = planStagger({ suggestion, blocks, today: now })

  if (shifts.length === 0) {
    // The common case, and it is not an error in the code: the detector reasons
    // about harvest windows, so it will happily propose shifting a crop that
    // has been in the ground since April.
    const planted = refused.filter(r => r.reason === 'already-planted').length
    throw new ExpectedFailure(planted > 0
      ? `Tidak ada tanam yang bisa digeser: ${planted} blok sudah ditanam. `
        + 'Penggeseran hanya berlaku untuk tanam yang belum dimulai.'
      : 'Tidak ada tanam yang bisa digeser untuk minggu ini.')
  }

  for (const shift of shifts) {
    const { error } = await db.from('block')
      .update({ planting_date: toISODate(shift.shiftedDate) })
      .eq('id', shift.blockId)
    if (error) throw new Error(`Gagal menggeser tanam: ${error.message}`)
  }

  // Append rather than replace: the column is a log of every stagger this
  // cooperative has applied, and figure 4 reads all of them.
  const { data: coop } = await db
    .from('cooperative').select('stagger_applied').eq('id', cooperativeId).maybeSingle()
  const existing = Array.isArray(coop?.stagger_applied) ? coop.stagger_applied : []

  const added = shifts.map(shift => ({
    // The season a shift belongs to is the one it moves the planting into.
    season_label: `MT-${shift.shiftedDate.getUTCFullYear()}`,
    block_id: shift.blockId,
    original_date: toISODate(shift.originalDate),
    shifted_date: toISODate(shift.shiftedDate),
  }))

  const { error: logError } = await db.from('cooperative')
    .update({ stagger_applied: [...existing, ...added] })
    .eq('id', cooperativeId)
  if (logError) throw new Error(`Gagal mencatat penggeseran: ${logError.message}`)

  revalidatePath('/dashboard')
  return { shifted: shifts.length }
}

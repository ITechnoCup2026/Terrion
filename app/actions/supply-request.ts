'use server'

import { revalidatePath } from 'next/cache'

import { toISODate } from '@/lib/agronomy/dates'
import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { requireRole } from '@/lib/auth/session'
import { deliveryPreferenceNote } from '@/lib/catalog/copy'
import { parseListingId } from '@/lib/catalog/listings'
import { loadCooperativeListings } from '@/lib/catalog/load'
import { createSupplyRequestSchema, respondToRequestSchema } from '@/lib/schemas/supply-request'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Records a buyer's request against one catalogue listing.
 *
 * The listing is re-derived here rather than trusted from the form. Only the
 * volume, the delivery preference and the notes come from the buyer; the
 * cooperative, the commodity and the delivery window come from the projection,
 * so a crafted POST cannot invent a window the cooperative never offered. The
 * buyer's name and organisation are copied from their profile for the same
 * reason, and because app_user is unreadable to the pengurus who will judge it.
 */
export async function createSupplyRequest(
  raw: unknown,
): Promise<ActionResult<{ requestId: string }>> {
  return attempt(() => createSupplyRequestBody(raw))
}

// The body, kept separate so `attempt` can wrap it without this file's every
// line moving three spaces to the right.
async function createSupplyRequestBody(raw: unknown): Promise<{ requestId: string }> {
  const input = createSupplyRequestSchema.parse(raw)
  const user = await requireRole(['buyer'])

  const parsed = parseListingId(input.listingId)
  if (!parsed) throw new ExpectedFailure('Listing tidak dikenali.')

  const listings = await loadCooperativeListings(parsed.cooperativeId)
  const listing = listings.find(l => l.id === input.listingId)
  if (!listing) {
    throw new ExpectedFailure('Listing ini sudah tidak tersedia. Muat ulang katalog.')
  }

  const note = [deliveryPreferenceNote(input.deliveryPreference), input.notes]
    .filter(Boolean).join('\n')

  const db = await createServerClient()
  const { data, error } = await db.from('supply_contract_request').insert({
    cooperative_id: listing.cooperativeId,
    buyer_id: user.id,
    // From the session, never the form. A buyer cannot present themselves to a
    // cooperative as somebody else by editing a POST.
    buyer_name: user.full_name,
    buyer_organisation: user.organisation,
    commodity_id: listing.commodityId,
    volume_kg: Math.round(input.volumeTonnes * 1000),
    window_start: toISODate(listing.weekStart),
    window_end: toISODate(listing.weekEnd),
    notes: note,
  }).select('id').single()

  if (error || !data) throw new Error(`Gagal mengirim permintaan: ${error?.message ?? 'unknown'}`)
  return { requestId: data.id }
}

/**
 * Accepts or declines one request.
 *
 * The update is not filtered by cooperative here on purpose: the coop_respond
 * RLS policy already restricts it to the caller's own cooperative, and adding a
 * second check in application code would make the policy look optional. A
 * pengurus of another cooperative matches zero rows and changes nothing.
 */
export async function respondToRequest(raw: unknown): Promise<ActionResult<void>> {
  return attempt(() => respondToRequestBody(raw))
}

async function respondToRequestBody(raw: unknown): Promise<void> {
  const input = respondToRequestSchema.parse(raw)
  await requireRole(['pengurus'])

  const db = await createServerClient()
  const { error } = await db.from('supply_contract_request')
    .update({ status: input.decision, responded_at: new Date().toISOString() })
    .eq('id', input.requestId)

  if (error) throw new Error(`Gagal menjawab permintaan: ${error.message}`)
  revalidatePath('/requests')
}

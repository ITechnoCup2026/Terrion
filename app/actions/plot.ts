'use server'

import { after } from 'next/server'

import { toISODate } from '@/lib/agronomy/dates'
import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { requireRole } from '@/lib/auth/session'
import { blockLabel } from '@/lib/schemas/block'
import { createPlotSchema, plotAreaHa } from '@/lib/schemas/plot'
import { createServerClient } from '@/lib/supabase/server'
import { backfillPlotGrid } from '@/lib/weather/sync'

/**
 * Registers one plot and a block for each thing planted on it.
 *
 * A plot used to be one block, which meant a farmer with carrots on one corner
 * and rice on the rest had to register the same field twice. It takes a list
 * now, and the plot's area is the SUM of that list rather than a number typed
 * beside it -- so a plot can never claim an area its blocks do not add up to.
 *
 * Weather for the plot's grid cell is fetched after the response, not during
 * it: a kader standing in a field on a weak connection must never wait on
 * Open-Meteo to find out whether their plot saved.
 */
export async function createPlot(
  raw: unknown,
): Promise<ActionResult<{ plotId: string; publicId: string }>> {
  return attempt(() => createPlotBody(raw))
}

// The body, kept separate so `attempt` can wrap it without this file's every
// line moving three spaces to the right.
async function createPlotBody(raw: unknown): Promise<{ plotId: string; publicId: string }> {
  const input = createPlotSchema.parse(raw)
  const user = await requireRole(['kader', 'pengurus'])
  const cooperativeId = user.cooperative_id
  if (!cooperativeId) {
    throw new ExpectedFailure('Akun ini tidak terhubung ke koperasi mana pun.')
  }

  const db = await createServerClient()

  // Find-or-create the farmer. Kaders type names, not ids, and the same farmer
  // registers several plots in one sitting.
  const { data: existing, error: lookupError } = await db.from('member')
    .select('id')
    .eq('cooperative_id', cooperativeId)
    .ilike('name', input.memberName)
    .maybeSingle()
  if (lookupError) throw new Error(`Gagal mencari anggota: ${lookupError.message}`)

  let memberId = existing?.id
  if (!memberId) {
    const { data: created, error } = await db.from('member')
      .insert({ cooperative_id: cooperativeId, name: input.memberName })
      .select('id').single()
    if (error || !created) throw new Error(`Gagal menambah anggota: ${error?.message ?? 'unknown'}`)
    memberId = created.id
  }

  const publicId = crypto.randomUUID().slice(0, 8)
  const areaHa = plotAreaHa(input.plantings)

  const { data: plot, error: plotError } = await db.from('plot').insert({
    cooperative_id: cooperativeId,
    member_id: memberId,
    public_id: publicId,
    name: input.plotName,
    area_ha: areaHa,
    lat: input.lat,
    lng: input.lng,
  }).select('id, grid_lat, grid_lng').single()
  if (plotError || !plot) throw new Error(`Gagal menyimpan lahan: ${plotError?.message ?? 'unknown'}`)

  // One insert for the whole list, so a plot never ends up with some of its
  // land planted and the rest lost to a failure halfway through a loop.
  const { error: blockError } = await db.from('block').insert(
    input.plantings.map((planting, index) => ({
      plot_id: plot.id,
      label: blockLabel(index),
      area_ha: planting.areaHa,
      order_index: index,
      commodity_id: planting.commodityId,
      variety_id: planting.varietyId,
      planting_date: toISODate(planting.plantingDate),
    })),
  )
  if (blockError) throw new Error(`Gagal menyimpan blok: ${blockError.message}`)

  // after() keeps the runtime alive until this finishes. A bare floating
  // promise would be killed when the response returns, and the plot would sit
  // there with no weather and therefore no prediction.
  after(async () => {
    try {
      await backfillPlotGrid(Number(plot.grid_lat), Number(plot.grid_lng))
    } catch (e) {
      console.error('weather backfill failed for', plot.id, e)
    }
  })

  return { plotId: plot.id, publicId }
}

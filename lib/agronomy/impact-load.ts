// The database side of the four impact figures, kept apart from
// lib/agronomy/impact.ts so the arithmetic stays unit-testable without a
// Supabase connection — the same split lib/rdkk/load.ts uses.
//
// Projections are passed in rather than re-derived: the dashboard has already
// paid for projectCooperative by the time it wants these figures, and running
// it twice would double the weather reads.

import { createServiceClient } from '@/lib/supabase/server'
import { computeImpact } from './impact'
import { utcDate } from './dates'
import type { HarvestedBlock, ImpactFigures, OrderLine, ReferencePrice, StaggerRecord } from './impact'
import type { BlockProjection } from './types'

const PAGE = 1000

type Page<T> = { data: T[] | null; error: { message: string } | null }

// Read every row, not the first thousand. PostgREST caps an unpaged select.
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<Page<T>>, what: string,
): Promise<T[]> {
  const all: T[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await page(offset, offset + PAGE - 1)
    if (error) throw new Error(`${what} failed: ${error.message}`)
    all.push(...(data ?? []))
    if (!data || data.length < PAGE) return all
  }
}

// A date column that may be null, as a UTC Date.
const maybeDate = (v: string | null): Date | null => (v ? utcDate(v) : null)

// A numeric column PostgREST may hand back as a string.
const maybeNumber = (v: number | string | null): number | null =>
  v == null ? null : Number(v)

/**
 * `cooperative.stagger_applied` as the accepted-suggestion log.
 *
 * Nothing writes this column yet, so this defines its shape rather than
 * discovering it: an array of snake_case records matching the column naming
 * used everywhere else. Anything malformed is dropped rather than throwing —
 * one bad row must not take the whole dashboard down.
 */
function parseStagger(raw: unknown): StaggerRecord[] {
  if (!Array.isArray(raw)) return []

  return raw.flatMap((entry): StaggerRecord[] => {
    if (typeof entry !== 'object' || entry === null) return []
    const r = entry as Record<string, unknown>
    const blockId = r.block_id
    const original = r.original_date
    const shifted = r.shifted_date
    if (typeof blockId !== 'string') return []
    if (typeof original !== 'string' || typeof shifted !== 'string') return []

    return [{
      seasonLabel: typeof r.season_label === 'string' ? r.season_label : '',
      blockId,
      originalDate: utcDate(original),
      shiftedDate: utcDate(shifted),
    }]
  })
}

/** The four dashboard figures for one cooperative. */
export async function loadImpact(input: {
  cooperativeId: string
  projections: BlockProjection[]
  capacity: Map<string, number> | null
}): Promise<ImpactFigures> {
  const db = createServiceClient()

  const { data: coop } = await db
    .from('cooperative')
    .select('province, stagger_applied')
    .eq('id', input.cooperativeId)
    .maybeSingle()

  const plots = await fetchAll((from, to) => db.from('plot')
    .select('id').eq('cooperative_id', input.cooperativeId).range(from, to), 'plot read')

  const blockRows = plots.length === 0 ? [] : await fetchAll((from, to) => db.from('block')
    .select('id, commodity_id, actual_harvest_date, actual_yield_kg, actual_price_per_kg, payment_received_date')
    .in('plot_id', plots.map(p => p.id))
    .not('actual_harvest_date', 'is', null)
    .range(from, to), 'harvested block read')

  const blocks: HarvestedBlock[] = blockRows.map(b => ({
    blockId: b.id,
    commodityId: b.commodity_id,
    actualHarvestDate: maybeDate(b.actual_harvest_date),
    actualYieldKg: maybeNumber(b.actual_yield_kg),
    actualPricePerKg: maybeNumber(b.actual_price_per_kg),
    paymentReceivedDate: maybeDate(b.payment_received_date),
  }))

  // Only the province the cooperative sells in; a price from another province
  // is not the reference these farmers were paid against.
  const commodityIds = [...new Set(blocks.map(b => b.commodityId))]
  const priceRows = (!coop?.province || commodityIds.length === 0) ? [] : await fetchAll(
    (from, to) => db.from('reference_price')
      .select('commodity_id, week_start, price_per_kg')
      .eq('province', coop.province)
      .in('commodity_id', commodityIds)
      .range(from, to), 'reference price read')

  const referencePrices: ReferencePrice[] = priceRows.map(r => ({
    commodityId: r.commodity_id,
    weekStart: utcDate(r.week_start),
    pricePerKg: Number(r.price_per_kg),
  }))

  const orders = await fetchAll((from, to) => db.from('input_order')
    .select('id, status').eq('cooperative_id', input.cooperativeId).range(from, to), 'input order read')

  const statusOf = new Map(orders.map(o => [o.id, o.status]))
  const lineRows = orders.length === 0 ? [] : await fetchAll((from, to) => db.from('input_order_line')
    .select('input_order_id, quantity, retail_price_per_unit, bulk_price_per_unit')
    .in('input_order_id', orders.map(o => o.id))
    .range(from, to), 'input order line read')

  const orderLines: OrderLine[] = lineRows.flatMap((l): OrderLine[] => {
    const status = statusOf.get(l.input_order_id)
    if (!status) return []
    return [{
      quantity: Number(l.quantity),
      retailPricePerUnit: maybeNumber(l.retail_price_per_unit),
      bulkPricePerUnit: maybeNumber(l.bulk_price_per_unit),
      status,
    }]
  })

  return computeImpact({
    blocks,
    referencePrices,
    orderLines,
    staggerApplied: parseStagger(coop?.stagger_applied),
    projections: input.projections,
    capacity: input.capacity,
  })
}

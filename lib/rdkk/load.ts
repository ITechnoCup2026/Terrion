// The database side of Flow D, kept apart from lib/rdkk/aggregate.ts so the
// arithmetic stays unit-testable without a Supabase connection.

import { createServiceClient } from '@/lib/supabase/server'
import { toISODate } from '@/lib/agronomy/dates'
import { aggregateInputs } from './aggregate'
import type { FertiliserRate, PlantedBlock, RdkkAggregate } from './aggregate'

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

/** The planting window an RDKK covers. `season_label` on input_order is free
 *  text, so the caller states the dates rather than the label being parsed. */
export type Season = { label: string; start: Date; end: Date }

// Every input requirement for one cooperative's season, ready for the review
// screen and the printable export.
export async function loadSeasonInputs(
  cooperativeId: string, season: Season,
): Promise<RdkkAggregate> {
  const db = createServiceClient()

  const plots = await fetchAll((from, to) => db.from('plot')
    .select('id, member_id')
    .eq('cooperative_id', cooperativeId).range(from, to), 'plot read')
  if (plots.length === 0) return { members: [], totals: [], commoditiesWithoutRates: [] }

  const members = await fetchAll((from, to) => db.from('member')
    .select('id, name')
    .eq('cooperative_id', cooperativeId).range(from, to), 'member read')
  const memberName = new Map(members.map(m => [m.id, m.name]))
  const memberOfPlot = new Map(plots.map(p => [p.id, p.member_id]))

  const blocks = await fetchAll((from, to) => db.from('block')
    .select('id, plot_id, commodity_id, area_ha, planting_date')
    .in('plot_id', plots.map(p => p.id))
    .gte('planting_date', toISODate(season.start))
    .lte('planting_date', toISODate(season.end))
    .range(from, to), 'block read')

  const planted: PlantedBlock[] = blocks.flatMap(b => {
    const memberId = memberOfPlot.get(b.plot_id)
    // A block whose plot is outside this cooperative cannot appear here, so a
    // miss means the plot read and the block read disagree — drop it rather
    // than inventing a member.
    if (!memberId) return []
    return [{
      blockId: b.id,
      memberId,
      memberName: memberName.get(memberId) ?? 'Anggota tanpa nama',
      commodityId: b.commodity_id,
      areaHa: Number(b.area_ha),
    }]
  })

  const rateRows = await fetchAll((from, to) => db.from('fertiliser_rate')
    .select('commodity_id, input_item, kg_per_ha, source').range(from, to), 'rate read')

  const rates: FertiliserRate[] = rateRows.map(r => ({
    commodityId: r.commodity_id,
    inputItem: r.input_item,
    kgPerHa: Number(r.kg_per_ha),
    source: r.source,
  }))

  return aggregateInputs({ blocks: planted, rates })
}

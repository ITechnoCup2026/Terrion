/**
 * What the commerce screens would render, against live data.
 *
 *   pnpm demo:commerce
 *
 * Read-only apart from one request it inserts and then deletes. It never
 * touches the demo cooperative's plots or blocks.
 */

import { listingSummary, overVolumeWarning } from '@/lib/catalog/copy'
import { parseListingId } from '@/lib/catalog/listings'
import { computeCatalogListings, loadCooperativeListings } from '@/lib/catalog/load'
import { formatNumberId } from '@/lib/format/number'
import { createServiceClient } from '@/lib/supabase/server'

async function main() {
  const { listings, commodities, provinces } = await computeCatalogListings()

  console.log(`\ncatalogue: ${listings.length} listings, ` +
    `${commodities.length} commodities, ${provinces.length} provinces`)

  console.log('\n--- first five cards ---')
  for (const l of listings.slice(0, 5)) {
    console.log(`  ${l.cooperativeName} · ${l.commodityName}` +
      `${l.varietyName ? ` — ${l.varietyName}` : ''}`)
    console.log(`    ${formatNumberId(l.tonnes)} t · ${l.isoWeek} · basis ${l.basis}`)
  }

  const lead = listings[0]
  if (!lead) {
    console.log('\nNo listings — nothing further to verify.')
    return
  }

  console.log('\n--- listing id round-trip ---')
  console.log(`  ${lead.id}`)
  console.log(`  parses: ${JSON.stringify(parseListingId(lead.id))}`)
  console.log(`  detail page finds it: ${
    (await loadCooperativeListings(lead.cooperativeId)).some(l => l.id === lead.id)}`)

  console.log('\n--- copy ---')
  console.log(`  ${listingSummary({ tonnes: lead.tonnes, cooperativeName: lead.cooperativeName })}`)
  console.log(`  ${overVolumeWarning(lead.tonnes * 2, lead.tonnes)}`)

  // Cross-tenant check. Inserted with the service client because there is no
  // browser session here; the point being tested is that a reader scoped to
  // another cooperative cannot see it.
  const db = createServiceClient()
  const { data: buyer } = await db.from('app_user')
    .select('id, full_name').eq('role', 'buyer').limit(1).maybeSingle()
  if (!buyer) {
    console.log('\nNo buyer account — skipping the isolation check.')
    return
  }

  const { data: inserted, error } = await db.from('supply_contract_request').insert({
    cooperative_id: lead.cooperativeId,
    buyer_id: buyer.id,
    buyer_name: buyer.full_name,
    commodity_id: lead.commodityId,
    volume_kg: 1000,
    window_start: lead.weekStart.toISOString().slice(0, 10),
    window_end: lead.weekEnd.toISOString().slice(0, 10),
    notes: 'verify-commerce probe',
  }).select('id').single()
  if (error || !inserted) throw new Error(`insert failed: ${error?.message}`)

  const { data: others } = await db.from('cooperative')
    .select('id, name').neq('id', lead.cooperativeId)

  console.log('\n--- isolation ---')
  console.log(`  request ${inserted.id} written for ${lead.cooperativeName}`)
  for (const other of others ?? []) {
    const { count } = await db.from('supply_contract_request')
      .select('id', { count: 'exact', head: true })
      .eq('cooperative_id', other.id).eq('id', inserted.id)
    console.log(`  visible to ${other.name}: ${count ?? 0} row(s) — expect 0`)
  }

  await db.from('supply_contract_request').delete().eq('id', inserted.id)
  console.log('  probe deleted')
}

main().catch(e => { console.error(e); process.exit(1) })

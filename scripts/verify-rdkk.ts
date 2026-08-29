/**
 * Task B8 step 3: checks the RDKK aggregation against the live demo cooperative.
 *
 *   pnpm demo:rdkk
 *
 * Three checks, each reaching the answer by a different route than
 * aggregateInputs takes:
 *   1. cooperative totals equal a hand-computed sum(area_ha) x kg_per_ha
 *   2. every planted hectare lands against exactly one member
 *   3. moving one block to another commodity moves the totals
 *
 * Check 3 writes to the database and restores in a finally block.
 */
import { createServiceClient } from '@/lib/supabase/server'
import { loadSeasonInputs } from '@/lib/rdkk/load'
import { utcDate } from '@/lib/agronomy/dates'

const SEASON = { label: 'all', start: utcDate('2000-01-01'), end: utcDate('2030-12-31') }

async function main() {
  const db = createServiceClient()
  const { data: coop } = await db.from('cooperative').select('id')
    .eq('name', 'Koperasi Tani Subang Jaya').single()

  // --- independent hand computation, by a different route than aggregateInputs
  const { data: plots } = await db.from('plot')
    .select('id, member_id').eq('cooperative_id', coop!.id)
  const { data: blocks } = await db.from('block')
    .select('id, plot_id, commodity_id, area_ha').in('plot_id', (plots ?? []).map(p => p.id))
  const { data: rates } = await db.from('fertiliser_rate')
    .select('commodity_id, input_item, kg_per_ha')

  const areaByCommodity = new Map<string, number>()
  for (const b of blocks ?? [])
    areaByCommodity.set(b.commodity_id,
      (areaByCommodity.get(b.commodity_id) ?? 0) + Number(b.area_ha))

  const handTotals = new Map<string, number>()
  for (const r of rates ?? []) {
    const area = areaByCommodity.get(r.commodity_id)
    if (area == null) continue
    handTotals.set(r.input_item,
      (handTotals.get(r.input_item) ?? 0) + area * Number(r.kg_per_ha))
  }

  const agg = await loadSeasonInputs(coop!.id, SEASON)
  console.log(`blocks ${blocks?.length}, members ${agg.members.length}`)
  console.log(`commodities without rates: ${JSON.stringify(agg.commoditiesWithoutRates)}`)

  let ok = true
  console.log('\nitem     aggregateInputs      hand-computed   match')
  for (const line of agg.totals) {
    const hand = handTotals.get(line.inputItem) ?? 0
    const match = Math.abs(hand - line.quantityKg) < 0.001
    if (!match) ok = false
    console.log(`${line.inputItem.padEnd(8)} ${line.quantityKg.toFixed(2).padStart(14)} ${hand.toFixed(2).padStart(16)}   ${match ? 'yes' : 'NO'}`)
  }
  if (handTotals.size !== agg.totals.length) {
    ok = false
    console.log(`item count mismatch: ${agg.totals.length} vs ${handTotals.size}`)
  }

  // --- area conservation: every planted hectare reaches exactly one member
  const totalPlantedBlocks = (blocks ?? []).reduce((s, b) => s + Number(b.area_ha), 0)
  const totalPlantedMembers = agg.members.reduce((s, m) => s + m.plantedHa, 0)
  const areaOk = Math.abs(totalPlantedBlocks - totalPlantedMembers) < 0.001
  if (!areaOk) ok = false
  console.log(`\narea conserved: ${totalPlantedBlocks.toFixed(4)} ha in blocks -> ${totalPlantedMembers.toFixed(4)} ha across members  ${areaOk ? 'yes' : 'NO'}`)

  const over = agg.members.filter(m => m.overSubsidyCap)
  console.log(`over the 2 ha cap: ${over.length} of ${agg.members.length} members` +
    (over.length ? ` (largest ${Math.max(...over.map(m => m.plantedHa)).toFixed(2)} ha)` : ''))

  // --- the totals must move when a block's commodity changes
  const victim = (blocks ?? []).find(b => b.commodity_id === areaByCommodity.keys().next().value)!
  const { data: other } = await db.from('commodity').select('id, slug').neq('id', victim.commodity_id).limit(1).single()
  const ureaBefore = agg.totals.find(l => l.inputItem === 'urea')!.quantityKg

  // The restore runs even if the reload throws. This script writes to live demo
  // data, and a half-applied change would leave the cooperative quietly wrong.
  let ureaAfter = ureaBefore
  try {
    await db.from('block').update({ commodity_id: other!.id }).eq('id', victim.id)
    const after = await loadSeasonInputs(coop!.id, SEASON)
    ureaAfter = after.totals.find(l => l.inputItem === 'urea')!.quantityKg
  } finally {
    await db.from('block').update({ commodity_id: victim.commodity_id }).eq('id', victim.id)
  }

  const moved = Math.abs(ureaAfter - ureaBefore) > 0.001
  if (!moved) ok = false
  console.log(`\nurea total after moving one ${Number(victim.area_ha).toFixed(2)} ha block to "${other!.slug}": ` +
    `${ureaBefore.toFixed(2)} -> ${ureaAfter.toFixed(2)}  moved: ${moved ? 'yes' : 'NO'}`)

  const restored = await loadSeasonInputs(coop!.id, SEASON)
  const backOk = Math.abs(restored.totals.find(l => l.inputItem === 'urea')!.quantityKg - ureaBefore) < 0.001
  console.log(`restored: ${backOk ? 'yes' : 'NO'}`)
  if (!backOk) ok = false

  console.log(`\n${ok ? 'ALL CHECKS PASS' : 'CHECKS FAILED'}`)
  process.exit(ok ? 0 : 1)
}
main().catch(e => { console.error(e); process.exit(1) })

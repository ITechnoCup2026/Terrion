// Runs the dashboard's computation against the live demo cooperative and
// prints what the page would render, sentence for sentence.
//
// The page itself is a server component and cannot be asserted on without a
// browser. This covers the part that actually matters: that the alerts carry
// real computed numbers rather than placeholders, that the basis is named,
// and that the projection weeks bracket their own point estimate.

import { detectCollisions } from '@/lib/agronomy/collide'
import { addDays } from '@/lib/agronomy/dates'
import { projectCooperative } from '@/lib/agronomy/project'
import { collisionBasis, collisionHeadline, staggerSentence } from '@/lib/dashboard/copy'
import { selectLeadCollision } from '@/lib/dashboard/lead'
import { weeklyProjection } from '@/lib/dashboard/series'
import { loadImpact } from '@/lib/agronomy/impact-load'
import { formatNumberId } from '@/lib/format/number'
import { formatRupiah, formatRupiahSigned } from '@/lib/format/rupiah'
import { loadSeasonInputs } from '@/lib/rdkk/load'
import { createServiceClient } from '@/lib/supabase/server'

async function main() {
  const db = createServiceClient()

  // The database holds test cooperatives alongside the demo one; the demo is
  // the one with plots in it, so pick by size rather than by arrival order.
  const { data: coops } = await db.from('cooperative').select('id, name')
  if (!coops?.length) throw new Error('no cooperative in the database')

  const sized = await Promise.all(coops.map(async c => {
    const { count } = await db
      .from('plot').select('id', { count: 'exact', head: true }).eq('cooperative_id', c.id)
    return { ...c, plots: count ?? 0 }
  }))
  const coop = sized.sort((a, b) => b.plots - a.plots)[0]
  console.log(`Cooperative: ${coop.name} (${coop.plots} plots)\n`)

  const now = new Date()
  const { projections } = await projectCooperative(coop.id, now)
  const { count: totalPlots } = await db
    .from('plot').select('id', { count: 'exact', head: true }).eq('cooperative_id', coop.id)

  console.log(`projections: ${projections.length} blocks, ${totalPlots} plots`)

  const { data: capacityRows } = await db
    .from('cooperative_capacity').select('commodity_id, tonnes_per_week')
    .eq('cooperative_id', coop.id)
  const capacity = capacityRows?.length
    ? new Map(capacityRows.map(r => [r.commodity_id, Number(r.tonnes_per_week)]))
    : null
  console.log(`capacity rows: ${capacityRows?.length ?? 0} (basis will be ${capacity ? 'capacity' : 'median'})\n`)

  const { weeks, flagged, suggestions } = detectCollisions(projections, capacity)
  console.log(`collision: ${weeks.length} week buckets, ${flagged.length} flagged\n`)

  const { data: commodities } = await db.from('commodity').select('id, name')
  const commodityName = new Map((commodities ?? []).map(c => [c.id, c.name]))

  const plotOf = new Map(projections.map(p => [p.blockId, p.plotId]))
  const plotsIn = (blockIds: string[]) =>
    new Set(blockIds.map(id => plotOf.get(id)).filter(Boolean)).size

  console.log('--- every flagged week ---')
  for (const f of [...flagged].sort((a, b) => b.tonnes - a.tonnes)) {
    console.log(
      `  ${f.weekStart.toISOString().slice(0, 10)}  ${String(commodityName.get(f.commodityId)).padEnd(10)}` +
      ` ${formatNumberId(f.tonnes).padStart(7)} t  thr ${formatNumberId(f.threshold).padStart(6)}` +
      `  ratio ${formatNumberId(f.tonnes / f.threshold)}  plots ${plotsIn(f.contributingBlockIds)}`,
    )
  }
  console.log()

  const worst = selectLeadCollision(
    flagged.map(f => ({ ...f, plotCount: plotsIn(f.contributingBlockIds) })),
  )
  if (worst) {
    const plotOfBlock = new Map(projections.map(p => [p.blockId, p.plotId]))
    const plotIds = [...new Set(
      worst.contributingBlockIds.map(id => plotOfBlock.get(id)).filter((id): id is string => !!id),
    )]
    const suggestion = suggestions.find(
      s => s.isoWeek === worst.isoWeek && s.commodityId === worst.commodityId,
    )

    console.log('--- CollisionAlert renders ---')
    console.log(`Penumpukan panen · ${commodityName.get(worst.commodityId)}`)
    console.log(collisionHeadline({
      plotCount: plotIds.length,
      totalPlots: totalPlots ?? 0,
      weekStart: worst.weekStart,
      tonnes: worst.tonnes,
    }))
    console.log(`Itu ${collisionBasis(worst)}.`)
    console.log(suggestion ? staggerSentence(suggestion) : '(no stagger suggestion)')
    console.log()
  } else {
    console.log('--- no collision flagged; the empty state renders ---\n')
  }

  const series = weeklyProjection({ projections, from: now })
  const broken = series.filter(w => w.minTonnes > w.expectedTonnes + 1e-9 || w.maxTonnes < w.expectedTonnes - 1e-9)
  console.log('--- ProjectionChart renders ---')
  console.log(`${series.length} weeks; band violations: ${broken.length}`)
  for (const w of series.slice(0, 6)) {
    console.log(
      `  ${w.weekStart.toISOString().slice(0, 10)}  ` +
      `exp ${formatNumberId(w.expectedTonnes).padStart(8)} t   ` +
      `band ${formatNumberId(w.minTonnes)}–${formatNumberId(w.maxTonnes)} t`,
    )
  }
  console.log()

  const rdkk = await loadSeasonInputs(coop.id, {
    label: 'musim ini', start: addDays(now, -365), end: now,
  })
  console.log('--- GroupPurchaseAlert renders ---')
  const summary = rdkk.totals
    .map(l => `${l.inputItem} ${l.quantityKg >= 1000 ? `${formatNumberId(l.quantityKg / 1000)} t` : `${formatNumberId(l.quantityKg)} kg`}`)
    .join(', ')
  console.log(`Kebutuhan pupuk untuk ${totalPlots} lahan musim ini sudah diagregasi: ${summary}.`)
  console.log(`commodities without rates: ${rdkk.commoditiesWithoutRates.length}`)
  console.log()

  const impact = await loadImpact({ cooperativeId: coop.id, projections, capacity })
  console.log('--- ImpactPanel renders ---')
  const tile = (label: string, v: number | null, fmt: (n: number) => string) =>
    console.log(`  ${label.padEnd(24)} ${v === null ? 'Belum ada data musim ini' : fmt(v)}`)

  tile('Harga vs acuan', impact.priceVsReference, n => `${formatRupiahSigned(n)}/kg`)
  tile('Panen ke pembayaran', impact.daysToPayment, n => `${formatNumberId(n)} hari`)
  tile('Hemat pembelian input', impact.inputCostSaved, formatRupiah)
  tile('Tonase dipindahkan', impact.tonnesDiverted, n => `${formatNumberId(n)} ton`)
}

main().catch(err => { console.error(err); process.exit(1) })

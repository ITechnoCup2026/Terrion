import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import type { CommodityRef } from '@/components/plots/PlotCard'
import { PlotsView } from '@/components/plots/PlotsView'
import { MetricRow, type Metric } from '@/components/ui/Card'
import { Page } from '@/components/ui/Page'
import { addDays, toISODate } from '@/lib/agronomy/dates'
import { loadAtlasCooperatives } from '@/lib/atlas/load'
import { currentAppUser } from '@/lib/auth/session'
import { loadCommodities } from '@/lib/commodities/load'
import { formatNumberId } from '@/lib/format/number'
import { loadPlots } from '@/lib/plots/load'

export const metadata = { title: 'Lahan' }

// A plot registered a moment ago has to appear immediately.
export const dynamic = 'force-dynamic'

function seasonShortcuts(now: Date) {
  const year = now.getUTCFullYear()
  return [
    { label: 'Hari ini', date: toISODate(now) },
    { label: `MT I ${year}/${String(year + 1).slice(2)}`, date: `${year}-10-01` },
    { label: `MT II ${year}`, date: `${year}-04-01` },
  ]
}

export default async function PlotsPage() {
  const now = new Date()
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (!user.cooperative_id) redirect('/catalog')

  // GET /api/plots already returns each plot sorted by soonest harvest, with
  // its window and expected tonnage pre-computed.
  const [summaries, commodityCatalogue, cooperatives] = await Promise.all([
    loadPlots(),
    loadCommodities(),
    loadAtlasCooperatives(),
  ])

  const commodities: CommodityRef[] = commodityCatalogue.map(c => ({
    id: c.id, name: c.name, spriteRow: c.spriteRow,
  }))

  const formCommodities = commodityCatalogue.map(c => ({ id: c.id, name: c.name }))
  const formVarieties = commodityCatalogue.flatMap(c =>
    c.varieties.map(v => ({ id: v.id, commodity_id: v.commodityId, name: v.name })))
  const cooperative = cooperatives.find(c => c.id === user.cooperative_id)

  const formData = {
    commodities: formCommodities,
    varieties: formVarieties,
    origin: { lat: cooperative?.lat ?? -6.2833, lng: cooperative?.lng ?? 107.8167 },
    seasonShortcuts: seasonShortcuts(now),
  }

  // The four figures describe the cooperative, not the current filter: they
  // are the fixed thing a narrowed list is measured against.
  const soon = addDays(now, 30)
  const dueSoon = summaries.filter(s => s.nextWindow && s.nextWindow.start <= soon).length
  const kpis: Metric[] = [
    { label: 'Lahan', value: formatNumberId(summaries.length) },
    {
      label: 'Luas total',
      value: `${formatNumberId(summaries.reduce((s, p) => s + p.areaHa, 0))} ha`,
    },
    {
      label: 'Blok aktif',
      value: formatNumberId(summaries.reduce((s, p) => s + p.blockCount, 0)),
    },
    {
      label: 'Panen 30 hari',
      value: formatNumberId(dueSoon),
      hint: 'Lahan yang jatuh tempo',
      // The one figure on this row with a deadline attached to it.
      tone: dueSoon > 0 ? 'accent' : 'default',
    },
  ]

  return (
    <Page width="wide" className="flex flex-col gap-5">
      {summaries.length > 0 && <MetricRow items={kpis} />}

      {/* useSearchParams needs a boundary; without one the whole route opts out
          of static rendering with a build-time error. */}
      <Suspense fallback={null}>
        <PlotsView plots={summaries} commodities={commodities} formData={formData} />
      </Suspense>
    </Page>
  )
}

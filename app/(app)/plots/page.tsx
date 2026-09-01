import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { PlotBrowser } from '@/components/plots/PlotBrowser'
import type { CommodityRef } from '@/components/plots/PlotCard'
import { buttonVariants } from '@/components/ui/button'
import { MetricRow } from '@/components/ui/Card'
import { Page, PageHeader } from '@/components/ui/Page'
import { addDays } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { loadCommodities } from '@/lib/commodities/load'
import { formatNumberId } from '@/lib/format/number'
import { loadPlots } from '@/lib/plots/load'

export const metadata = { title: 'Lahan' }

// A plot registered a moment ago has to appear immediately.
export const dynamic = 'force-dynamic'

export default async function PlotsPage() {
  const now = new Date()
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (!user.cooperative_id) redirect('/catalog')

  // GET /api/plots already returns each plot sorted by soonest harvest, with
  // its window and expected tonnage pre-computed.
  const [summaries, commodityCatalogue] = await Promise.all([
    loadPlots(),
    loadCommodities(),
  ])

  const commodities: CommodityRef[] = commodityCatalogue.map(c => ({
    id: c.id, name: c.name, spriteRow: c.spriteRow,
  }))

  // The four figures describe the cooperative, not the current filter: they
  // are the fixed thing a narrowed list is measured against.
  const soon = addDays(now, 30)
  const kpis = [
    { label: 'Lahan', value: formatNumberId(summaries.length) },
    { label: 'Luas total', value: `${formatNumberId(summaries.reduce((s, p) => s + p.areaHa, 0))} ha` },
    { label: 'Blok aktif', value: formatNumberId(summaries.reduce((s, p) => s + p.blockCount, 0)) },
    {
      label: 'Panen 30 hari',
      value: formatNumberId(
        summaries.filter(s => s.nextWindow && s.nextWindow.start <= soon).length),
    },
  ]

  return (
    <Page width="wide" className="flex flex-col gap-5">
      <PageHeader
        title="Lahan"
        description="Setiap lahan koperasi ini, dengan perkiraan panen terdekatnya."
        actions={
          <Link href="/plots/new" className={buttonVariants()}>
            Daftarkan lahan
          </Link>
        }
      />

      {summaries.length > 0 && <MetricRow items={kpis} />}

      {/* useSearchParams needs a boundary; without one the whole route opts out
          of static rendering with a build-time error. */}
      <Suspense fallback={null}>
        <PlotBrowser plots={summaries} commodities={commodities} />
      </Suspense>
    </Page>
  )
}

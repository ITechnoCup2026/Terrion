import { redirect } from 'next/navigation'

import { PlotForm, type PreviousEntry } from '@/components/plots/PlotForm'
import { Page, PageHeader } from '@/components/ui/Page'
import { toISODate } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { loadAtlasCooperatives } from '@/lib/atlas/load'
import { loadCommodities } from '@/lib/commodities/load'
import { loadPlots } from '@/lib/plots/load'

export const metadata = { title: 'Daftarkan lahan' }

// Planting-season shortcuts beat a bare calendar: a kader registering thirty
// plots in a village is entering the same handful of dates over and over.
function seasonShortcuts(now: Date) {
  const year = now.getUTCFullYear()
  return [
    { label: 'Hari ini', date: toISODate(now) },
    { label: `MT I ${year}/${String(year + 1).slice(2)}`, date: `${year}-10-01` },
    { label: `MT II ${year}`, date: `${year}-04-01` },
  ]
}

export default async function NewPlotPage() {
  const user = await currentAppUser()
  if (!user || (user.role !== 'kader' && user.role !== 'pengurus')) redirect('/login')
  const cooperativeId = user.cooperative_id
  if (!cooperativeId) redirect('/login')

  const [commodityCatalogue, cooperatives, plots] = await Promise.all([
    loadCommodities(),
    loadAtlasCooperatives(),
    loadPlots(),
  ])

  const commodities = commodityCatalogue.map(c => ({ id: c.id, name: c.name }))
  const varieties = commodityCatalogue.flatMap(c =>
    c.varieties.map(v => ({ id: v.id, commodity_id: v.commodityId, name: v.name })))
  const cooperative = cooperatives.find(c => c.id === cooperativeId)

  // "Salin dari lahan sebelumnya" read the most recently registered plot's
  // first planting. GET /api/plots is sorted by soonest harvest, not by
  // registration date, and carries no block-level commodity/variety detail --
  // there is nothing in the contract to resolve this shortcut from, so it is
  // dropped rather than guessed at.
  const previous: PreviousEntry = null

  return (
    // A <div>, not a <main>: the shell already renders one, and nesting a
    // second landmark inside it makes "skip to content" ambiguous.
    <Page width="form" className="flex flex-col gap-6">
      <PageHeader
        title="Daftarkan lahan"
        description="Luas lahan adalah jumlah luas tanamannya. Tambah komoditas jika satu lahan ditanami lebih dari satu jenis; blok juga bisa dipecah setelahnya."
      />
      <PlotForm
        commodities={commodities}
        varieties={varieties}
        previous={previous}
        registered={plots.length}
        origin={{ lat: cooperative?.lat ?? -6.2833, lng: cooperative?.lng ?? 107.8167 }}
        seasonShortcuts={seasonShortcuts(new Date())}
      />
    </Page>
  )
}

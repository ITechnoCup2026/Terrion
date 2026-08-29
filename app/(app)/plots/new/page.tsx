import { redirect } from 'next/navigation'

import { PlotForm, type PreviousEntry } from '@/components/plots/PlotForm'
import { toISODate } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'

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

  const db = await createServerClient()

  const [{ data: commodities }, { data: varieties }, { data: coop }, { count }] = await Promise.all([
    db.from('commodity').select('id, name').order('sprite_row'),
    db.from('variety').select('id, commodity_id, name').order('name'),
    db.from('cooperative').select('lat, lng').eq('id', cooperativeId).maybeSingle(),
    db.from('plot').select('id', { count: 'exact', head: true }).eq('cooperative_id', cooperativeId),
  ])

  // "Salin dari lahan sebelumnya" reads the most recent registration.
  let previous: PreviousEntry = null
  const { data: lastPlot } = await db.from('plot')
    .select('id').eq('cooperative_id', cooperativeId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (lastPlot) {
    const { data: block } = await db.from('block')
      .select('commodity_id, variety_id, planting_date')
      .eq('plot_id', lastPlot.id).order('order_index').limit(1).maybeSingle()
    if (block) {
      previous = {
        commodityId: block.commodity_id,
        varietyId: block.variety_id,
        plantingDate: block.planting_date,
      }
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl p-4 sm:p-6">
      <h1 className="mb-1 text-lg font-semibold">Daftarkan lahan</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Luas lahan adalah jumlah luas tanamannya. Tambah komoditas jika satu
        lahan ditanami lebih dari satu jenis; blok juga bisa dipecah setelahnya.
      </p>
      <PlotForm
        commodities={commodities ?? []}
        varieties={varieties ?? []}
        previous={previous}
        registered={count ?? 0}
        origin={{ lat: Number(coop?.lat ?? -6.2833), lng: Number(coop?.lng ?? 107.8167) }}
        seasonShortcuts={seasonShortcuts(new Date())}
      />
    </main>
  )
}

import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { PlotBrowser } from '@/components/plots/PlotBrowser'
import type { CommodityRef } from '@/components/plots/PlotCard'
import { buttonVariants } from '@/components/ui/button'
import { addDays } from '@/lib/agronomy/dates'
import { projectCooperative } from '@/lib/agronomy/project'
import { currentAppUser } from '@/lib/auth/session'
import { formatNumberId } from '@/lib/format/number'
import { summarisePlots, type PlotRow } from '@/lib/plots/summary'
import { createServerClient } from '@/lib/supabase/server'

export const metadata = { title: 'Lahan' }

// A plot registered a moment ago has to appear immediately.
export const dynamic = 'force-dynamic'

export default async function PlotsPage() {
  const now = new Date()
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (!user.cooperative_id) redirect('/catalog')

  const db = await createServerClient()

  // RLS scopes this to the viewer's cooperative.
  const [{ data: rows }, { data: commodityRows }] = await Promise.all([
    db.from('plot')
      .select('id, name, area_ha, member:member_id(name)')
      .order('created_at', { ascending: false }),
    db.from('commodity').select('id, name, sprite_row').order('sprite_row'),
  ])

  const plots: PlotRow[] = (rows ?? []).map(p => ({
    id: p.id,
    name: p.name,
    areaHa: Number(p.area_ha),
    memberName: (p.member as unknown as { name: string } | null)?.name ?? null,
  }))

  // Projecting an empty cooperative is wasted work, and projectCooperative
  // reads every block of every plot.
  const { projections, windows } = plots.length === 0
    ? { projections: [], windows: new Map() }
    : await projectCooperative(user.cooperative_id)

  const summaries = summarisePlots({ plots, projections, windows })

  const commodities: CommodityRef[] = (commodityRows ?? []).map(c => ({
    id: c.id, name: c.name, spriteRow: c.sprite_row,
  }))

  // The four figures describe the cooperative, not the current filter: they
  // are the fixed thing a narrowed list is measured against.
  const soon = addDays(now, 30)
  const kpis = [
    { label: 'Lahan', value: formatNumberId(plots.length) },
    { label: 'Luas total', value: `${formatNumberId(plots.reduce((s, p) => s + p.areaHa, 0))} ha` },
    { label: 'Blok aktif', value: formatNumberId(projections.length) },
    {
      label: 'Panen 30 hari',
      value: formatNumberId(
        summaries.filter(s => s.nextWindow && s.nextWindow.start <= soon).length),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Lahan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Setiap lahan koperasi ini, dengan perkiraan panen terdekatnya.
          </p>
        </div>
        <Link href="/plots/new" className={buttonVariants()}>Daftarkan lahan</Link>
      </div>

      {plots.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map(k => (
            <div
              key={k.label}
              className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-[var(--shadow-xs)]"
            >
              <dt className="text-xs text-muted-foreground">{k.label}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {k.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* useSearchParams needs a boundary; without one the whole route opts out
          of static rendering with a build-time error. */}
      <Suspense fallback={null}>
        <PlotBrowser plots={summaries} commodities={commodities} />
      </Suspense>
    </div>
  )
}

import { redirect } from 'next/navigation'

import { CollisionAlert, type CollisionAlertData } from '@/components/dashboard/CollisionAlert'
import { GroupPurchaseAlert } from '@/components/dashboard/GroupPurchaseAlert'
import { ImpactPanel } from '@/components/dashboard/ImpactPanel'
import { ProjectionChart, type ChartWeek } from '@/components/dashboard/ProjectionChart'
import { UpcomingHarvests } from '@/components/dashboard/UpcomingHarvests'
import { EmptyState } from '@/components/ui/EmptyState'
import { detectCollisions } from '@/lib/agronomy/collide'
import { addDays } from '@/lib/agronomy/dates'
import { loadImpact } from '@/lib/agronomy/impact-load'
import { projectCooperative } from '@/lib/agronomy/project'
import { currentAppUser } from '@/lib/auth/session'
import { selectLeadCollision } from '@/lib/dashboard/lead'
import { weeklyProjection } from '@/lib/dashboard/series'
import { upcomingHarvests, upcomingTonnes, type PlotRef } from '@/lib/dashboard/upcoming'
import { formatNumberId } from '@/lib/format/number'
import { MONTHS_ID } from '@/lib/harvest/format'
import { loadSeasonInputs } from '@/lib/rdkk/load'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata = { title: 'Dasbor' }

// The projection is a live read of every block; nothing here may be cached
// into next season.
export const dynamic = 'force-dynamic'

// A week's bucket start, as an axis tick. This labels a seven-day bucket, not
// any plot's harvest — a harvest date still only ever renders through
// <HarvestWindow>.
function weekTick(weekStart: Date): string {
  return `${weekStart.getUTCDate()} ${MONTHS_ID[weekStart.getUTCMonth()]}`
}

export default async function DashboardPage() {
  const user = await currentAppUser()
  if (!user || user.role === 'buyer') redirect('/login')
  const cooperativeId = user.cooperative_id
  if (!cooperativeId) redirect('/login')

  const now = new Date()
  const db = createServiceClient()

  const { projections } = await projectCooperative(cooperativeId, now)

  // The cooperative's own stated weekly capacity, where it set one. Absent, the
  // collision detector falls back to a multiple of its own median week.
  const { data: capacityRows } = await db
    .from('cooperative_capacity')
    .select('commodity_id, tonnes_per_week')
    .eq('cooperative_id', cooperativeId)

  const capacity = capacityRows?.length
    ? new Map(capacityRows.map(r => [r.commodity_id, Number(r.tonnes_per_week)]))
    : null

  const { flagged, suggestions } = detectCollisions(projections, capacity)
  const weeks = weeklyProjection({ projections, from: now })

  // A chart week is "risk" when the collision detector flagged that ISO week
  // for any commodity — the chart aggregates commodities, the alert names one.
  const flaggedWeeks = new Set(flagged.map(f => f.isoWeek))
  const chartWeeks: ChartWeek[] = weeks.map(w => ({
    label: weekTick(w.weekStart),
    expected: w.expectedTonnes,
    min: w.minTonnes,
    max: w.maxTonnes,
    risk: flaggedWeeks.has(w.isoWeek),
  }))

  const [{ count: totalPlots }, { data: commodities }] = await Promise.all([
    db.from('plot').select('id', { count: 'exact', head: true }).eq('cooperative_id', cooperativeId),
    db.from('commodity').select('id, name'),
  ])

  const commodityName = new Map((commodities ?? []).map(c => [c.id, c.name]))

  // A board acts on one thing at a time, and the thing worth acting on is a
  // week where plots converge — see lib/dashboard/lead.ts for why that is not
  // simply the heaviest week.
  const plotOfBlock = new Map(projections.map(p => [p.blockId, p.plotId]))
  const plotIdsFor = (blockIds: string[]) => [...new Set(
    blockIds.map(id => plotOfBlock.get(id)).filter((id): id is string => !!id),
  )]

  const worst = selectLeadCollision(
    flagged.map(f => ({ ...f, plotCount: plotIdsFor(f.contributingBlockIds).length })),
  )

  let alert: CollisionAlertData | null = null
  if (worst) {
    const plotIds = plotIdsFor(worst.contributingBlockIds)

    const { data: plotRows } = await db
      .from('plot')
      .select('id, name, member:member_id(name)')
      .in('id', plotIds)

    const contributingPlots = (plotRows ?? []).map(p => ({
      id: p.id,
      name: p.name,
      memberName:
        (Array.isArray(p.member) ? p.member[0]?.name : p.member?.name) ?? 'Anggota',
    }))

    const suggestion = suggestions.find(
      s => s.isoWeek === worst.isoWeek && s.commodityId === worst.commodityId,
    ) ?? null

    alert = {
      isoWeek: worst.isoWeek,
      commodityId: worst.commodityId,
      weekStart: worst.weekStart,
      commodityName: commodityName.get(worst.commodityId) ?? 'Komoditas',
      tonnes: worst.tonnes,
      basis: worst.basis,
      threshold: worst.threshold,
      plotCount: plotIds.length,
      totalPlots: totalPlots ?? plotIds.length,
      contributingPlots,
      suggestion,
    }
  }

  // Whose harvest is due in the coming week. The chart says how much; a
  // pengurus reading this on Sunday needs the names before Monday.
  //
  // Only the plots that actually have a block due are looked up, so this is a
  // small `in` rather than a second read of every plot in the cooperative.
  const week = { from: now, to: addDays(now, 7) }
  const dueBlocks = projections.filter(
    p => p.window.start <= week.to && p.window.end >= week.from)
  const { data: duePlotRows } = dueBlocks.length === 0
    ? { data: [] }
    : await db.from('plot').select('id, name, member:member_id(name)')
        .in('id', [...new Set(dueBlocks.map(p => p.plotId))])

  const duePlots = new Map<string, PlotRef>((duePlotRows ?? []).map(p => [p.id, {
    name: p.name,
    memberName: (Array.isArray(p.member) ? p.member[0]?.name : p.member?.name) ?? null,
  }]))

  const UPCOMING_SHOWN = 5
  const allUpcoming = upcomingHarvests({
    projections, from: week.from, to: week.to,
    plots: duePlots, commodities: commodityName,
  })
  const upcoming = allUpcoming.slice(0, UPCOMING_SHOWN)

  // Inputs are aggregated from what is actually recorded as planted, so the
  // season is the twelve months behind us rather than a season nobody has
  // entered yet.
  const [rdkk, impact] = await Promise.all([
    loadSeasonInputs(cooperativeId, {
      label: 'musim ini',
      start: addDays(now, -365),
      end: now,
    }),
    // Reuses the projections already computed above rather than paying for a
    // second projectCooperative pass.
    loadImpact({ cooperativeId, projections, capacity }),
  ])

  // The four figures at the top, all derived from work already done above.
  // The peak week is the heaviest of the twelve, which is not necessarily a
  // flagged one -- a heavy week inside capacity is fine, and saying so is part
  // of the point.
  const peak = weeks.reduce<typeof weeks[number] | null>(
    (best, w) => (best === null || w.expectedTonnes > best.expectedTonnes ? w : best), null)

  const kpis = [
    {
      label: 'Panen 12 minggu',
      value: `${formatNumberId(weeks.reduce((s, w) => s + w.expectedTonnes, 0))} ton`,
    },
    {
      label: 'Minggu puncak',
      value: peak ? `${weekTick(peak.weekStart)} · ${formatNumberId(peak.expectedTonnes)} t` : '—',
    },
    { label: 'Minggu berisiko', value: formatNumberId(flaggedWeeks.size) },
    { label: 'Lahan', value: formatNumberId(totalPlots ?? 0) },
  ]

  return (
    // The page owns its padding now: the shell stopped applying any, so that
    // the farm page can fill the screen without fighting a parent.
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Dasbor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Proyeksi panen 12 minggu ke depan untuk seluruh lahan koperasi.
        </p>
      </div>

      {/* Four figures, read in one line. They were four full-width slabs, so
          the page opened with numbers stacked like paragraphs and the one
          thing worth acting on sat below the fold. */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      {/* Full width, and directly under the figures: it is the single thing on
          this page a board can act on. */}
      {alert ? (
        <CollisionAlert data={alert} />
      ) : (
        <EmptyState
          title="Tidak ada penumpukan panen terdeteksi"
          description="Tidak ada minggu yang melewati kapasitas koperasi dalam 12 minggu ke depan."
        />
      )}

      {/* The chart is the evidence behind the alert, so it gets two thirds and
          sits beside the things it is not evidence for. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-xs)] lg:col-span-2">
          <h2 className="text-sm font-medium text-foreground">Proyeksi panen mingguan</h2>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">
            Batang menunjukkan perkiraan; area abu-abu menunjukkan rentang antara panen
            yang pasti jatuh di minggu itu dan yang mungkin seluruhnya jatuh di sana.
          </p>
          {/* min-h-0 so the chart can take the leftover height rather than
              being pushed past the bottom of the card. */}
          <div className="min-h-0 flex-1">
            <ProjectionChart weeks={chartWeeks} />
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <UpcomingHarvests
            rows={upcoming}
            totalTonnes={upcomingTonnes(allUpcoming)}
            hidden={allUpcoming.length - upcoming.length}
          />
          <GroupPurchaseAlert
            totals={rdkk.totals}
            plotCount={totalPlots ?? 0}
            seasonLabel="musim ini"
            commoditiesWithoutRates={rdkk.commoditiesWithoutRates}
          />
        </div>
      </div>

      {/* Last, because it looks backwards: what the cooperative already got
          out of this, rather than what it must do next. */}
      <ImpactPanel figures={impact} />
    </div>
  )
}

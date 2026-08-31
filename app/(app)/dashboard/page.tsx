import { redirect } from 'next/navigation'

import { CollisionAlert, type CollisionAlertData } from '@/components/dashboard/CollisionAlert'
import { GroupPurchaseAlert } from '@/components/dashboard/GroupPurchaseAlert'
import { ImpactPanel } from '@/components/dashboard/ImpactPanel'
import { ProjectionChart, type ChartWeek } from '@/components/dashboard/ProjectionChart'
import { UpcomingHarvests } from '@/components/dashboard/UpcomingHarvests'
import { EmptyState } from '@/components/ui/EmptyState'
import { addDays } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { loadDashboard } from '@/lib/dashboard/load'
import { formatNumberId } from '@/lib/format/number'
import { MONTHS_ID } from '@/lib/harvest/format'
import { loadPlots } from '@/lib/plots/load'
import { loadSeasonInputs, seasonRequirementLines } from '@/lib/rdkk/load'

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

const UPCOMING_SHOWN = 5

export default async function DashboardPage() {
  const user = await currentAppUser()
  if (!user || user.role === 'buyer') redirect('/login')
  if (!user.cooperative_id) redirect('/login')

  const now = new Date()

  // GET /api/dashboard is one projection covering the 12-week chart, the
  // collision detector's flagged weeks and lead pile-up, its staggering
  // suggestions, the coming week's harvests, and the four impact figures --
  // all pre-computed, so this page is a mapping from that response to the
  // props each widget already expects, not a re-computation of any of it.
  const [dashboard, plots, rdkk] = await Promise.all([
    loadDashboard(),
    loadPlots(),
    loadSeasonInputs({ label: 'musim ini', start: addDays(now, -365), end: now }),
  ])

  const flaggedWeeks = new Set(dashboard.flagged.map(f => f.isoWeek))
  const chartWeeks: ChartWeek[] = dashboard.weeks.map(w => ({
    label: weekTick(w.weekStart),
    expected: w.expectedTonnes,
    min: w.minTonnes,
    max: w.maxTonnes,
    risk: flaggedWeeks.has(w.isoWeek),
  }))

  let alert: CollisionAlertData | null = null
  if (dashboard.lead) {
    const lead = dashboard.lead
    const suggestion = dashboard.suggestions.find(
      s => s.isoWeek === lead.isoWeek && s.commodityId === lead.commodityId,
    ) ?? null

    alert = {
      isoWeek: lead.isoWeek,
      commodityId: lead.commodityId,
      weekStart: lead.weekStart,
      commodityName: lead.commodityName,
      tonnes: lead.tonnes,
      basis: lead.basis,
      threshold: lead.threshold,
      plotCount: lead.plotCount,
      totalPlots: plots.length,
      // GET /api/dashboard names which blocks contribute (block_ids), not
      // which plots -- and no contract endpoint maps a block id back to its
      // plot's name and farmer without a per-plot lookup this page has no
      // reason to make. The count above is real; the roster is not available.
      contributingPlots: [],
      suggestion: suggestion
        ? { blockIds: suggestion.blockIds, shiftDays: suggestion.shiftDays, tonnesMoved: suggestion.tonnesMoved }
        : null,
    }
  }

  const upcomingRows = dashboard.upcoming.rows.slice(0, UPCOMING_SHOWN)

  const peak = dashboard.weeks.reduce<typeof dashboard.weeks[number] | null>(
    (best, w) => (best === null || w.expectedTonnes > best.expectedTonnes ? w : best), null)

  const kpis = [
    {
      label: 'Panen 12 minggu',
      value: `${formatNumberId(dashboard.weeks.reduce((s, w) => s + w.expectedTonnes, 0))} ton`,
    },
    {
      label: 'Minggu puncak',
      value: peak ? `${weekTick(peak.weekStart)} · ${formatNumberId(peak.expectedTonnes)} t` : '—',
    },
    { label: 'Minggu berisiko', value: formatNumberId(flaggedWeeks.size) },
    { label: 'Lahan', value: formatNumberId(plots.length) },
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
            rows={upcomingRows}
            totalTonnes={dashboard.upcoming.totalTonnes}
            hidden={dashboard.upcoming.rows.length - upcomingRows.length}
          />
          <GroupPurchaseAlert
            totals={seasonRequirementLines(rdkk)}
            plotCount={plots.length}
            seasonLabel="musim ini"
            commoditiesWithoutRates={rdkk.commoditiesWithoutRates}
          />
        </div>
      </div>

      {/* Last, because it looks backwards: what the cooperative already got
          out of this, rather than what it must do next. */}
      <ImpactPanel figures={dashboard.impact} />
    </div>
  )
}

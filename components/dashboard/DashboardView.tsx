import { CollisionAlert, CollisionClear, type CollisionAlertData } from '@/components/dashboard/CollisionAlert'
import { GroupPurchaseAlert } from '@/components/dashboard/GroupPurchaseAlert'
import { ImpactPanel } from '@/components/dashboard/ImpactPanel'
import { ProjectionPanel } from '@/components/dashboard/ProjectionPanel'
import type { ChartWeek } from '@/components/dashboard/ProjectionChart'
import { UpcomingHarvests } from '@/components/dashboard/UpcomingHarvests'
import { Page, PageHeader } from '@/components/ui/Page'
import type { DashboardData } from '@/lib/dashboard/load'
import type { RequirementLine } from '@/lib/rdkk/aggregate'

/**
 * The dashboard, as a function of the data it is handed.
 *
 * Split out of the route so the screen can be rendered without the Go API, a
 * database or a session — the page above is an auth check and three fetches,
 * this is every pixel.
 *
 * The order is the order a board reads in: the wave, then the one week that is
 * a problem and what to do about it, then the two lists that turn into work
 * this week, then what the season has already been worth. The page used to
 * open on a row of four totals, which put the only actionable thing on it
 * below the fold on a laptop.
 */

const UPCOMING_SHOWN = 5

export type DashboardViewProps = {
  dashboard: DashboardData
  plotCount: number
  rdkkTotals: RequirementLine[]
  commoditiesWithoutRates: string[]
  seasonLabel: string
}

export function DashboardView({
  dashboard, plotCount, rdkkTotals, commoditiesWithoutRates, seasonLabel,
}: DashboardViewProps) {
  const flaggedWeeks = new Set(dashboard.flagged.map(f => f.isoWeek))

  const chartWeeks: ChartWeek[] = dashboard.weeks.map(w => ({
    weekStart: w.weekStart,
    expected: w.expectedTonnes,
    min: w.minTonnes,
    max: w.maxTonnes,
    risk: flaggedWeeks.has(w.isoWeek),
  }))

  const peak = dashboard.weeks.reduce<typeof dashboard.weeks[number] | null>(
    (best, w) => (best === null || w.expectedTonnes > best.expectedTonnes ? w : best), null)

  const lead = dashboard.lead

  // The percentage is only true of the week it was measured on. Printing the
  // lead collision's ratio under a peak that falls in some other week would
  // caption one number with another number's evidence.
  const overCapacity = lead && peak && lead.isoWeek === peak.isoWeek
    ? {
        commodityName: lead.commodityName,
        percentOfCapacity: Math.round((lead.tonnes / lead.threshold) * 100),
      }
    : null

  let alert: CollisionAlertData | null = null
  if (lead) {
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
      totalPlots: plotCount,
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

  return (
    // The page owns its padding: the shell applies none, so that the farm page
    // can fill the screen without fighting a parent.
    <Page width="wide" className="flex flex-col gap-4">
      <PageHeader
        title="Dashboard"
        description="Proyeksi panen 12 minggu ke depan untuk seluruh lahan koperasi."
      />

      <ProjectionPanel
        weeks={chartWeeks}
        totalTonnes={dashboard.weeks.reduce((sum, w) => sum + w.expectedTonnes, 0)}
        peak={peak
          ? {
              tonnes: peak.expectedTonnes,
              min: peak.minTonnes,
              max: peak.maxTonnes,
              weekStart: peak.weekStart,
            }
          : null}
        flaggedCount={flaggedWeeks.size}
        plotCount={plotCount}
        overCapacity={overCapacity}
      />

      {alert
        ? <CollisionAlert data={alert} />
        : <CollisionClear peakTonnes={peak?.expectedTonnes ?? null} />}

      {/* Two panels of equal height, and each one owns the space it does not
          fill: the harvest list centres its empty state, the purchase panel
          settles its button on the bottom. Left to their natural heights they
          drew a short card beside a tall one with a column of page ground
          between them, which reads as a panel that failed to load.

          minmax(0,1fr), not 1fr: a grid track's default minimum is its
          content's, so one long unbreakable row in either panel widens the
          column and pushes the page into a horizontal scroll. */}
      <div className="grid gap-4 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        <UpcomingHarvests
          rows={upcomingRows}
          totalTonnes={dashboard.upcoming.totalTonnes}
          hidden={dashboard.upcoming.rows.length - upcomingRows.length}
        />
        <GroupPurchaseAlert
          totals={rdkkTotals}
          plotCount={plotCount}
          seasonLabel={seasonLabel}
          commoditiesWithoutRates={commoditiesWithoutRates}
        />
      </div>

      {/* Last, because it looks backwards: what the cooperative already got out
          of this, rather than what it must do next. */}
      <ImpactPanel figures={dashboard.impact} className="mt-2" />
    </Page>
  )
}

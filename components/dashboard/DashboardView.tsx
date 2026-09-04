import Link from 'next/link'
import { Calendar, PackageCheck, Sprout } from 'lucide-react'

import { CollisionAlert, type CollisionAlertData } from '@/components/dashboard/CollisionAlert'
import { GroupPurchaseAlert } from '@/components/dashboard/GroupPurchaseAlert'
import { CalibrationPanel } from '@/components/dashboard/CalibrationPanel'
import { ImpactPanel } from '@/components/dashboard/ImpactPanel'
import { ProjectionPanel } from '@/components/dashboard/ProjectionPanel'
import type { ChartWeek } from '@/components/dashboard/ProjectionChart'
import { UpcomingHarvests } from '@/components/dashboard/UpcomingHarvests'
import { Page, PageHeader } from '@/components/ui/Page'
import { buttonVariants } from '@/components/ui/button'
import type { DashboardData } from '@/lib/dashboard/load'
import { formatNumberId } from '@/lib/format/number'
import type { RequirementLine } from '@/lib/rdkk/aggregate'
import { cn } from '@/lib/utils'

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

  const totalExpected = dashboard.weeks.reduce((sum, w) => sum + w.expectedTonnes, 0)

  const peak = dashboard.weeks.reduce<typeof dashboard.weeks[number] | null>(
    (best, w) => (best === null || w.expectedTonnes > best.expectedTonnes ? w : best), null)

  const lead = dashboard.lead

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
      contributingPlots: [],
      suggestion: suggestion
        ? { blockIds: suggestion.blockIds, shiftDays: suggestion.shiftDays, tonnesMoved: suggestion.tonnesMoved }
        : null,
    }
  }

  const upcomingRows = dashboard.upcoming.rows.slice(0, UPCOMING_SHOWN)
  const totalRdkkKg = rdkkTotals.reduce((sum, l) => sum + l.quantityKg, 0)

  return (
    <Page width="wide" className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Pantau proyeksi panen 12 minggu ke depan, kebutuhan pupuk RDKK, dan jadwal panen riil."
        actions={
          <div className="flex items-center gap-2.5">
            <Link
              href="/plots"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'interactive gap-2 rounded-lg font-medium hover:bg-[var(--terrion-green-50)]')}
            >
              <Sprout className="size-4 text-[var(--terrion-green-600)]" />
              Kelola Lahan
            </Link>
            <Link
              href="/purchases"
              className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'interactive gap-2 rounded-lg font-medium bg-[var(--terrion-green-700)] hover:bg-[var(--terrion-green-900)] text-white shadow-[0_2px_10px_rgba(15,77,60,0.25)]')}
            >
              <PackageCheck className="size-4" />
              Dokumen RDKK
            </Link>
          </div>
        }
      />



      {/* Quick Agronomic Metric Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="panel flex flex-col justify-between p-5 transition-all hover:border-[var(--terrion-green-300)]">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Proyeksi 12 Minggu</span>
            <Calendar className="size-4 text-[var(--terrion-green-600)]" />
          </div>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight text-[var(--terrion-green-700)] tabular-nums">
              {formatNumberId(totalExpected)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">ton</span>
          </p>
        </div>

        <div className="panel flex flex-col justify-between p-5 transition-all hover:border-[var(--terrion-green-300)]">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Puncak Tonase</span>
            <span className="badge-tag">
              Minggu Padat
            </span>
          </div>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight text-[var(--terrion-green-700)] tabular-nums">
              {peak ? formatNumberId(peak.expectedTonnes) : 0}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">ton</span>
          </p>
        </div>

        <div className="panel flex flex-col justify-between p-5 transition-all hover:border-[var(--terrion-green-300)]">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Lahan Terdaftar</span>
            <Sprout className="size-4 text-[var(--terrion-green-600)]" />
          </div>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {formatNumberId(plotCount)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">lahan aktif</span>
          </p>
        </div>

        <div className="panel flex flex-col justify-between p-5 transition-all hover:border-[var(--terrion-green-300)]">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Agregasi Pupuk</span>
            <PackageCheck className="size-4 text-[var(--terrion-green-600)]" />
          </div>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {totalRdkkKg >= 1000 ? formatNumberId(totalRdkkKg / 1000) : formatNumberId(totalRdkkKg)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {totalRdkkKg >= 1000 ? 'ton' : 'kg'}
            </span>
          </p>
        </div>
      </div>

      <ProjectionPanel
        weeks={chartWeeks}
        totalTonnes={totalExpected}
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

      {alert && <CollisionAlert data={alert} />}

      <div className="grid gap-6 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
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

      <CalibrationPanel calibrations={dashboard.calibrations} />

      <ImpactPanel figures={dashboard.impact} />
    </Page>
  )
}





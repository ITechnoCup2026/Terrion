import { utcDate } from '@/lib/agronomy/dates'
import type { ImpactFigures } from '@/lib/agronomy/impact'
import { apiFetch } from '@/lib/api/client'
import type { DashboardResponseRaw, ThresholdBasis } from '@/lib/api/types'
import { currentSessionId } from '@/lib/auth/session'
import type { UpcomingHarvest } from '@/lib/dashboard/upcoming'

export type DashboardWeek = {
  isoWeek: string
  weekStart: Date
  expectedTonnes: number
  minTonnes: number
  maxTonnes: number
  blockIds: string[]
}

export type DashboardFlaggedWeek = {
  isoWeek: string
  weekStart: Date
  commodityId: string
  commodityName: string
  tonnes: number
  threshold: number
  basis: ThresholdBasis
  plotCount: number
  blockIds: string[]
}

export type DashboardSuggestion = {
  isoWeek: string
  commodityId: string
  commodityName: string
  blockIds: string[]
  shiftDays: number
  tonnesMoved: number
  resultingTonnes: number
}

export type DashboardData = {
  weeks: DashboardWeek[]
  flagged: DashboardFlaggedWeek[]
  lead: DashboardFlaggedWeek | null
  suggestions: DashboardSuggestion[]
  upcoming: { rows: UpcomingHarvest[]; totalTonnes: number }
  impact: ImpactFigures
}

function toFlaggedWeek(raw: DashboardResponseRaw['flagged'][number]): DashboardFlaggedWeek {
  return {
    isoWeek: raw.iso_week,
    weekStart: utcDate(raw.week_start),
    commodityId: raw.commodity_id,
    commodityName: raw.commodity_name,
    tonnes: raw.tonnes,
    threshold: raw.threshold,
    basis: raw.basis,
    plotCount: raw.plot_count,
    blockIds: raw.block_ids,
  }
}

/**
 * GET /api/dashboard is one projection covering everything the dashboard
 * used to compute client-side (projectCooperative, detectCollisions,
 * selectLeadCollision, upcomingHarvests, computeImpact) -- this loader is a
 * straight field mapping, not a re-computation.
 */
export async function loadDashboard(): Promise<DashboardData> {
  const sessionId = await currentSessionId()
  const raw = await apiFetch<DashboardResponseRaw>('/api/dashboard', { sessionId })

  return {
    weeks: raw.weeks.map(w => ({
      isoWeek: w.iso_week,
      weekStart: utcDate(w.week_start),
      expectedTonnes: w.expected_tonnes,
      minTonnes: w.min_tonnes,
      maxTonnes: w.max_tonnes,
      blockIds: w.block_ids,
    })),
    flagged: raw.flagged.map(toFlaggedWeek),
    lead: raw.lead ? toFlaggedWeek(raw.lead) : null,
    suggestions: raw.suggestions.map(s => ({
      isoWeek: s.iso_week,
      commodityId: s.commodity_id,
      commodityName: s.commodity_name,
      blockIds: s.block_ids,
      shiftDays: s.shift_days,
      tonnesMoved: s.tonnes_moved,
      resultingTonnes: s.resulting_tonnes,
    })),
    upcoming: {
      rows: raw.upcoming.rows.map(r => ({
        blockId: r.block_id,
        plotId: r.plot_id,
        plotName: r.plot_name,
        memberName: r.member_name,
        commodityName: r.commodity_name,
        tonnes: r.tonnes,
        start: utcDate(r.start),
        end: utcDate(r.end),
      })),
      totalTonnes: raw.upcoming.total_tonnes,
    },
    impact: {
      priceVsReference: raw.impact.price_vs_reference,
      daysToPayment: raw.impact.days_to_payment,
      inputCostSaved: raw.impact.input_cost_saved,
      tonnesDiverted: raw.impact.tonnes_diverted,
    },
  }
}

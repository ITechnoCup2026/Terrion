import type {
  PlanAssignmentRaw, PlanEngine, PlanMetricsRaw, PlanObjective, PlanRaw,
  ProposePlanResponseRaw,
} from '@/lib/api/types'

export type { PlanEngine, PlanObjective }

export type PlanAssignment = {
  candidateId: string
  plotId: string
  plotName: string
  commodityId: string
  varietyId: string
  areaHa: number
  plantingDate: string
  harvestStart: string
  harvestEnd: string
  tonnesLow: number
  tonnesMid: number
  tonnesHigh: number
  plausibility: string
}

export type PlanMetrics = {
  expectedPeakTonnes: number
  worstCasePeakTonnes: number
  peakTonnesP50: number | null
  peakTonnesP90: number | null
  totalTonnes: number
  grossValue: number | null
  grossValueSource: string | null
  demandCoveredKg: number
  capacityTonnesPerWeek: number | null
}

export type Plan = {
  objective: PlanObjective
  assignments: PlanAssignment[]
  metrics: PlanMetrics
  narrative: string | null
  narrativeSource: 'llm' | 'template' | 'none'
}

export type PlanProposal = {
  season: { label: string; start: string; end: string }
  engine: PlanEngine
  plans: Plan[]
  candidateCount: number
  evaluations: number
  degraded: string[]
}

/**
 * What each plan is actually for.
 *
 * These are three corners of one trade-off, not three attempts at the same
 * answer ranked best to worst — and the copy says so, because "three best
 * plans" is a claim that falls over the moment anyone asks what "best" meant.
 * Each one answers a different question, so a pengurus picks by deciding
 * which question is theirs this season.
 */
export const OBJECTIVE_COPY: Record<PlanObjective, {
  label: string
  question: string
  detail: string
}> = {
  aman: {
    label: 'Aman',
    question: 'Kalau cuaca membuat panen datang bersamaan, apakah kita masih sanggup?',
    detail:
      'Dinilai pada musim yang buruk, bukan pada musim rata-rata. Rencana yang hanya '
      + 'aman di musim rata-rata bukan rencana aman.',
  },
  pendapatan: {
    label: 'Pendapatan',
    question: 'Apa yang paling bernilai, dengan menerima sebagian risikonya?',
    detail:
      'Mengejar nilai panen tertinggi. Mengejar nilai memang berarti mengambil risiko, '
      + 'dan itu keputusan pengurus, bukan keputusan sistem.',
  },
  pasar: {
    label: 'Terikat pasar',
    question: 'Apa yang memenuhi permintaan pembeli yang sudah kita terima?',
    detail:
      'Kepastiannya datang dari kontrak yang sudah ada, bukan dari cuaca.',
  },
}

export const ENGINE_COPY: Record<PlanEngine, { label: string; detail: string }> = {
  'ai-service': {
    label: 'Layanan AI',
    detail: 'Disusun oleh layanan perencanaan, dengan rentang risiko dari ribuan musim simulasi.',
  },
  fallback: {
    label: 'Mesin cadangan',
    detail:
      'Layanan AI sedang tidak dipakai, jadi rencana ini disusun oleh mesin di dalam Terrion '
      + 'sendiri. Angkanya tetap utuh; yang tidak tersedia hanya rentang risiko P50/P90.',
  },
}

function toAssignment(raw: PlanAssignmentRaw): PlanAssignment {
  return {
    candidateId: raw.candidate_id,
    plotId: raw.plot_id,
    plotName: raw.plot_name,
    commodityId: raw.commodity_id,
    varietyId: raw.variety_id,
    areaHa: raw.area_ha,
    plantingDate: raw.planting_date,
    harvestStart: raw.harvest_start,
    harvestEnd: raw.harvest_end,
    tonnesLow: raw.tonnes_low,
    tonnesMid: raw.tonnes_mid,
    tonnesHigh: raw.tonnes_high,
    plausibility: raw.plausibility,
  }
}

function toMetrics(raw: PlanMetricsRaw): PlanMetrics {
  return {
    expectedPeakTonnes: raw.expected_peak_tonnes,
    worstCasePeakTonnes: raw.worst_case_peak_tonnes,
    peakTonnesP50: raw.peak_tonnes_p50,
    peakTonnesP90: raw.peak_tonnes_p90,
    totalTonnes: raw.total_tonnes,
    grossValue: raw.gross_value,
    grossValueSource: raw.gross_value_source,
    demandCoveredKg: raw.demand_covered_kg,
    capacityTonnesPerWeek: raw.capacity_tonnes_per_week,
  }
}

function toPlan(raw: PlanRaw): Plan {
  return {
    objective: raw.objective,
    assignments: raw.assignments.map(toAssignment),
    metrics: toMetrics(raw.metrics),
    narrative: raw.narrative,
    narrativeSource: raw.narrative_source,
  }
}

export function toProposal(raw: ProposePlanResponseRaw): PlanProposal {
  return {
    season: raw.season,
    engine: raw.engine,
    plans: raw.plans.map(toPlan),
    candidateCount: raw.diagnostics.candidate_count,
    evaluations: raw.diagnostics.evaluations,
    degraded: raw.diagnostics.degraded ?? [],
  }
}

/**
 * True when the reference price panel behind a plan's rupiah is still the
 * synthetic seed data. The screen has to say so next to the number.
 */
export function priceIsSynthetic(metrics: PlanMetrics): boolean {
  return (metrics.grossValueSource ?? '').toUpperCase().includes('SINTETIS')
}

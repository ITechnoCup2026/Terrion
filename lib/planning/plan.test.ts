import { describe, expect, it } from 'vitest'

import type { ProposePlanResponseRaw } from '@/lib/api/types'
import { OBJECTIVE_COPY, priceIsSynthetic, toProposal } from './plan'

function response(overrides: Partial<ProposePlanResponseRaw> = {}): ProposePlanResponseRaw {
  return {
    season: { label: 'MT I 2026/2027', start: '2026-10-01', end: '2027-03-31' },
    engine: 'fallback',
    plans: [
      {
        objective: 'aman',
        assignments: [
          {
            candidate_id: 'c001', plot_id: 'plot-1', plot_name: 'Blok Utara',
            commodity_id: 'k1', variety_id: 'v1', area_ha: 0.82,
            planting_date: '2026-10-05', harvest_start: '2027-01-02',
            harvest_end: '2027-01-16',
            tonnes_low: 2.91, tonnes_mid: 3.6, tonnes_high: 4.42,
            plausibility: 'ok',
          },
        ],
        metrics: {
          expected_peak_tonnes: 7.04,
          worst_case_peak_tonnes: 9.2,
          peak_tonnes_p50: null,
          peak_tonnes_p90: null,
          total_tonnes: 23.44,
          gross_value: 247429000,
          gross_value_source: 'SINTETIS — ganti dengan panel harga Badan Pangan Nasional',
          demand_covered_kg: 3670,
          capacity_tonnes_per_week: 12.5,
        },
        narrative: 'Rencana ini menyebar panen ke beberapa minggu.',
        narrative_source: 'template',
      },
    ],
    diagnostics: { candidate_count: 24, evaluations: 129, degraded: [] },
    ...overrides,
  }
}

describe('toProposal', () => {
  it('carries the engine through, because which machine answered is not a detail', () => {
    expect(toProposal(response()).engine).toBe('fallback')
    expect(toProposal(response({ engine: 'ai-service' })).engine).toBe('ai-service')
  })

  it('keeps the quantiles null when the Go solver produced the plan', () => {
    const [plan] = toProposal(response()).plans

    expect(plan.metrics.peakTonnesP50).toBeNull()
    expect(plan.metrics.peakTonnesP90).toBeNull()
  })

  it('maps every assignment field the apply request needs', () => {
    const [assignment] = toProposal(response()).plans[0].assignments

    expect(assignment).toMatchObject({
      plotId: 'plot-1',
      commodityId: 'k1',
      varietyId: 'v1',
      areaHa: 0.82,
      plantingDate: '2026-10-05',
    })
  })

  it('survives a response whose degraded list is absent', () => {
    const raw = response()
    // @ts-expect-error -- an older service build may omit the field entirely
    delete raw.diagnostics.degraded

    expect(toProposal(raw).degraded).toEqual([])
  })
})

describe('priceIsSynthetic', () => {
  it('flags the seeded sine-wave panel so the screen can say so', () => {
    expect(priceIsSynthetic(toProposal(response()).plans[0].metrics)).toBe(true)
  })

  it('stays quiet once a real price panel is behind the number', () => {
    const raw = response()
    raw.plans[0].metrics.gross_value_source = 'Badan Pangan Nasional'

    expect(priceIsSynthetic(toProposal(raw).plans[0].metrics)).toBe(false)
  })

  it('treats a missing provenance as not-yet-known rather than as verified', () => {
    const raw = response()
    raw.plans[0].metrics.gross_value_source = null

    expect(priceIsSynthetic(toProposal(raw).plans[0].metrics)).toBe(false)
  })
})

describe('OBJECTIVE_COPY', () => {
  // The three plans are three corners of one trade-off. If two of them ever
  // describe themselves the same way, the screen has stopped distinguishing
  // them and the reader is back to picking the biggest number.
  it('gives each objective its own question', () => {
    const questions = Object.values(OBJECTIVE_COPY).map(copy => copy.question)

    expect(new Set(questions).size).toBe(3)
  })
})

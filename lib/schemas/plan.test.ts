import { describe, expect, it } from 'vitest'

import { applyPlanSchema, cancelPlanSchema, seasonSchema } from './plan'

const season = {
  seasonLabel: 'MT I 2026/2027',
  seasonStart: '2026-10-01',
  seasonEnd: '2027-03-31',
}

describe('seasonSchema', () => {
  it('accepts a season that ends after it starts', () => {
    expect(seasonSchema.safeParse(season).success).toBe(true)
  })

  it('refuses a season that ends before it starts', () => {
    const backwards = { ...season, seasonStart: '2027-03-31', seasonEnd: '2026-10-01' }

    expect(seasonSchema.safeParse(backwards).success).toBe(false)
  })

  it('refuses a season with no length at all', () => {
    expect(seasonSchema.safeParse({ ...season, seasonEnd: season.seasonStart }).success).toBe(false)
  })

  it('refuses a date the backend would not parse', () => {
    expect(seasonSchema.safeParse({ ...season, seasonStart: '01/10/2026' }).success).toBe(false)
  })
})

describe('applyPlanSchema', () => {
  // The browser names which plan, never which land. If a plot id ever became
  // accepted here, a crafted form could rewrite fields the search never chose.
  it('takes only the objective, never the assignments', () => {
    const parsed = applyPlanSchema.parse({
      ...season,
      objective: 'aman',
      assignments: [{ plot_id: 'anything' }],
    })

    expect(parsed).not.toHaveProperty('assignments')
    expect(parsed.objective).toBe('aman')
  })

  it('refuses an objective the planner does not have', () => {
    expect(applyPlanSchema.safeParse({ ...season, objective: 'termurah' }).success).toBe(false)
  })
})

describe('cancelPlanSchema', () => {
  it('refuses anything that is not a plan id', () => {
    expect(cancelPlanSchema.safeParse({ planId: 'plan-1' }).success).toBe(false)
    expect(
      cancelPlanSchema.safeParse({ planId: '11111111-1111-4111-8111-111111111111' }).success,
    ).toBe(true)
  })
})

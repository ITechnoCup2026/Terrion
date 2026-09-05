'use server'

import { revalidatePath } from 'next/cache'

import { attempt, ExpectedFailure, type ActionResult } from '@/lib/actions/result'
import { apiFetch, ApiError } from '@/lib/api/client'
import type { ApplyPlanResponseRaw, ProposePlanResponseRaw } from '@/lib/api/types'
import { currentSessionId, requireRole } from '@/lib/auth/session'
import { toProposal, type PlanProposal } from '@/lib/planning/plan'
import { applyPlanSchema, cancelPlanSchema, seasonSchema } from '@/lib/schemas/plan'

const REFUSALS: Record<string, string> = {
  planning_no_plots:
    'Koperasi ini belum punya lahan yang tercatat, jadi belum ada yang bisa direncanakan.',
  planning_no_candidates:
    'Tidak ada kombinasi tanam yang masuk akal untuk musim ini. Coba rentang musim yang lebih panjang.',
  planning_season_invalid:
    'Rentang musim tidak masuk akal. Pastikan tanggal selesai berada setelah tanggal mulai.',
  planning_plan_not_found:
    'Rencana ini sudah tidak ada. Muat ulang halaman untuk melihat keadaan terbaru.',
}

function refusalFor(error: unknown): never {
  if (error instanceof ApiError && REFUSALS[error.code]) {
    throw new ExpectedFailure(REFUSALS[error.code])
  }
  throw error
}

async function fetchProposal(input: {
  seasonLabel: string
  seasonStart: string
  seasonEnd: string
}): Promise<PlanProposal> {
  const sessionId = await currentSessionId()

  try {
    const raw = await apiFetch<ProposePlanResponseRaw>('/api/plans/propose', {
      method: 'POST',
      sessionId,
      body: {
        season_label: input.seasonLabel,
        season_start: input.seasonStart,
        season_end: input.seasonEnd,
      },
    })
    return toProposal(raw)
  } catch (error) {
    refusalFor(error)
  }
}

/** Three plans for a season. Costs nothing and stores nothing. */
export async function proposePlan(raw: unknown): Promise<ActionResult<PlanProposal>> {
  return attempt(async () => {
    await requireRole(['kader', 'pengurus'])

    const parsed = seasonSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ExpectedFailure(parsed.error.issues[0]?.message ?? 'Isian tidak valid.')
    }

    return fetchProposal(parsed.data)
  })
}

/**
 * Commits one of the three plans: creates the blocks it describes.
 *
 * Re-runs the search server-side rather than trusting a list of plots posted
 * from the browser. The search is deterministic, so the same season gives the
 * same three plans -- and if the underlying land or prices changed since the
 * proposal was drawn, applying the stale one would have been wrong anyway.
 */
export async function applyPlan(
  raw: unknown,
): Promise<ActionResult<{ planId: string; blocksCreated: number; replacedExisting: boolean }>> {
  return attempt(async () => {
    await requireRole(['pengurus'])

    const parsed = applyPlanSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ExpectedFailure(parsed.error.issues[0]?.message ?? 'Isian tidak valid.')
    }

    const proposal = await fetchProposal(parsed.data)
    const chosen = proposal.plans.find(plan => plan.objective === parsed.data.objective)
    if (!chosen || chosen.assignments.length === 0) {
      throw new ExpectedFailure(
        'Rencana ini sudah tidak bisa disusun ulang untuk musim tersebut. Muat ulang halaman.',
      )
    }

    const sessionId = await currentSessionId()

    try {
      const result = await apiFetch<ApplyPlanResponseRaw>('/api/plans', {
        method: 'POST',
        sessionId,
        body: {
          season_label: parsed.data.seasonLabel,
          season_start: parsed.data.seasonStart,
          season_end: parsed.data.seasonEnd,
          objective: parsed.data.objective,
          engine: proposal.engine,
          assignments: chosen.assignments.map(assignment => ({
            plot_id: assignment.plotId,
            commodity_id: assignment.commodityId,
            variety_id: assignment.varietyId,
            area_ha: assignment.areaHa,
            planting_date: assignment.plantingDate,
          })),
        },
      })

      revalidatePath('/plots')
      revalidatePath('/dashboard')

      return {
        planId: result.plan_id,
        blocksCreated: result.blocks_created,
        replacedExisting: result.replaced_existing,
      }
    } catch (error) {
      refusalFor(error)
    }
  })
}

/** Withdraws an applied plan. Blocks whose harvest was recorded stay. */
export async function cancelPlan(raw: unknown): Promise<ActionResult<null>> {
  return attempt(async () => {
    await requireRole(['pengurus'])

    const parsed = cancelPlanSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ExpectedFailure('Rencana tidak dikenali.')
    }

    const sessionId = await currentSessionId()

    try {
      await apiFetch<null>(`/api/plans/${parsed.data.planId}`, { method: 'DELETE', sessionId })
      revalidatePath('/plots')
      revalidatePath('/dashboard')
      return null
    } catch (error) {
      refusalFor(error)
    }
  })
}

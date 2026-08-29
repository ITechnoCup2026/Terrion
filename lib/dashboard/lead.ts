// Which flagged week the dashboard leads with.
//
// The collision detector flags every week over its threshold, which is right.
// The alert can only lead with one of them, and the useful one is not simply
// the heaviest: a single plot above the threshold is a large plot, not a
// pile-up. There is nothing to stagger it against, so the advice degenerates
// to "shift 1 blok by 7 days", which changes nothing about the week.
//
// Weeks not chosen are not hidden — every flagged week is still marked on the
// projection chart. This only decides what the board reads first.

const PILEUP_MIN_PLOTS = 2

export type RankableWeek = { tonnes: number; plotCount: number }

/**
 * The week worth acting on: the heaviest one where several plots converge,
 * falling back to the heaviest overall when no week has more than one.
 * Ties on tonnage break toward the week involving more plots.
 */
export function selectLeadCollision<T extends RankableWeek>(weeks: T[]): T | null {
  if (weeks.length === 0) return null

  const byWeight = (a: T, b: T) => b.tonnes - a.tonnes || b.plotCount - a.plotCount

  const pileUps = weeks.filter(w => w.plotCount >= PILEUP_MIN_PLOTS)
  const pool = pileUps.length > 0 ? pileUps : weeks

  return [...pool].sort(byWeight)[0]
}

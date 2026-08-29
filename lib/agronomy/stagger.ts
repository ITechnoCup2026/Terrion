// Which blocks a staggering suggestion is allowed to move, and to when.
//
// Accepting a suggestion rewrites `block.planting_date` and logs the before and
// after into `cooperative.stagger_applied`. Impact figure 4 later winds those
// dates back to reconstruct the season that would have happened, so the log and
// the planting dates have to describe the same event: a log entry with no
// matching date change invents a diversion nobody achieved, and a date change
// with no log entry hides one.
//
// The invariant this file exists for: **only land that is not yet planted can
// be moved**. A block already in the ground has a real planting date; rewriting
// it would not move a single tonne of harvest, it would only make the record
// disagree with the field. The collision detector is happy to suggest shifting
// a crop that has been growing since April — it reasons about windows, not
// about what is physically possible — so the refusal has to live here, between
// the suggestion and the write.

import { addDays, daysBetween } from './dates'

/** A block the cooperative owns, as the planner needs to see it. */
export type ShiftCandidate = {
  blockId: string
  plantingDate: Date
}

/** One planting the cooperative may move, and where to. */
export type PlannedShift = {
  blockId: string
  originalDate: Date
  shiftedDate: Date
}

/** Why a block named by the suggestion could not be moved. */
export type Refusal = {
  blockId: string
  reason: 'already-planted' | 'would-be-in-the-past' | 'no-shift'
}

// Split a suggestion into the shifts that can be written and the ones that cannot.
export function planStagger(input: {
  suggestion: { blockIds: string[]; shiftDays: number }
  blocks: ShiftCandidate[]
  today: Date
}): { shifts: PlannedShift[]; refused: Refusal[] } {
  const byId = new Map(input.blocks.map(b => [b.blockId, b]))
  const shifts: PlannedShift[] = []
  const refused: Refusal[] = []

  for (const blockId of input.suggestion.blockIds) {
    // A block id the cooperative does not own is not a refusal to report back
    // to the user — it is an id that must never reach an update statement.
    const block = byId.get(blockId)
    if (!block) continue

    if (input.suggestion.shiftDays === 0) {
      refused.push({ blockId, reason: 'no-shift' })
      continue
    }

    // Planted today counts as in the ground: the seed is already down.
    if (daysBetween(input.today, block.plantingDate) <= 0) {
      refused.push({ blockId, reason: 'already-planted' })
      continue
    }

    const shiftedDate = addDays(block.plantingDate, input.suggestion.shiftDays)
    // Shifts can be negative, so a suggestion can propose pulling a planting
    // forward past today. That is the same impossibility from the other side.
    if (daysBetween(input.today, shiftedDate) <= 0) {
      refused.push({ blockId, reason: 'would-be-in-the-past' })
      continue
    }

    shifts.push({ blockId, originalDate: block.plantingDate, shiftedDate })
  }

  return { shifts, refused }
}

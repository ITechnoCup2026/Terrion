import type { GrowthStage } from './types'

/**
 * What a growth stage is called out loud.
 *
 * The pipeline carries stage as 0..4 because that is what the sprite sheet
 * indexes — five drawn frames of the same crop. A reader looking at a field
 * does not see a frame index, they see a phase, and until now the product had
 * no word for it anywhere: the canvas drew the right picture and the page said
 * nothing about what it meant.
 *
 * These are the phases an extension officer would use, mapped onto the frames
 * we actually have. The mapping is coarse on purpose — five frames cannot
 * resolve more than five phases, and inventing a sixth would be describing a
 * picture we did not draw.
 */
export const PHASE_LABELS: Record<GrowthStage, string> = {
  0: 'Baru ditanam',
  1: 'Vegetatif awal',
  2: 'Vegetatif akhir',
  3: 'Generatif',
  4: 'Menjelang panen',
}

/** One line on what the phase means, for readers who are not farmers. */
export const PHASE_NOTES: Record<GrowthStage, string> = {
  0: 'Benih atau bibit baru masuk; belum ada tajuk yang terbentuk.',
  1: 'Tanaman membentuk daun dan anakan; kebutuhan air paling tinggi.',
  2: 'Pertumbuhan daun melambat, tanaman menutup permukaan lahan.',
  3: 'Pembungaan dan pembentukan bulir atau buah.',
  4: 'Pengisian selesai, tanaman menua menuju siap panen.',
}

export function phaseLabel(stage: number): string {
  return PHASE_LABELS[clampStage(stage)]
}

export function phaseNote(stage: number): string {
  return PHASE_NOTES[clampStage(stage)]
}

/**
 * How far through the drawn ladder a stage sits, 0..1.
 *
 * For a progress bar only. It is NOT the fraction of GDD accumulated and must
 * never be labelled as one: the ladder has five rungs and a crop does not climb
 * them at an even pace.
 */
export function phaseProgress(stage: number): number {
  return clampStage(stage) / 4
}

function clampStage(stage: number): GrowthStage {
  const n = Math.max(0, Math.min(4, Math.round(stage)))
  return n as GrowthStage
}

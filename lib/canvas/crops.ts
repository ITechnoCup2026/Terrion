// One PNG holds every crop picture: rows = which crop, columns = growth stage.
export const CROP_CELL = 32
export const CROP_STAGES = 5

let cached: Promise<HTMLImageElement | null> | null = null

/**
 * Loads the crop sheet once and reuses it.
 * Resolves to null rather than rejecting — a missing sheet must degrade, not crash.
 */
export function loadCrops(src = '/sprites/crops.png'): Promise<HTMLImageElement | null> {
  if (cached) return cached
  cached = new Promise(resolve => {
    if (typeof window === 'undefined') return resolve(null)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
  return cached
}

/** Finds one crop picture in the sheet: which row, how grown, how big to cut. */
export function cropCell(spriteRow: number, stage: number) {
  const col = Math.min(Math.max(stage, 0), CROP_STAGES - 1)
  return { sx: col * CROP_CELL, sy: spriteRow * CROP_CELL, size: CROP_CELL }
}

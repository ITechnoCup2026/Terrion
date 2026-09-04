/**
 * The six edge motifs the decorative border is composed from.
 *
 * These decide WHICH ground goes where. They do not decide how one ground meets
 * another: that is lib/terrain/autotile.ts, which resolves each boundary from
 * the pack's own blob sets so the change reads as an organic edge rather than a
 * 32px step.
 *
 * This file used to say it deliberately did without autotiling, on the grounds
 * that a 47-variant lookup was expensive and easy to get subtly wrong. That was
 * right about the method it had in mind and wrong about the conclusion. The
 * variants are assembled once at build time rather than resolved per cell, and
 * the runtime rule reduces to four independent corners, so the cost is a table
 * lookup and the correctness is a test over all 256 arrangements.
 *
 * Six hand-composed motifs, one picked per edge with a seeded offset, still
 * give thousands of distinct farms.
 *
 * `depth` is how far a cell sits from the outside of the border: 0 is the
 * outermost ring, `border - 1` is the ring touching the plot fence. Motifs use
 * it to put water and trees out at the edge and keep quiet ground next to the
 * plot, so the scenery never crowds the diagram.
 */

/** Ground tile indices, in the order pnpm build:sprites writes ground.png. */
export const GROUND = [
  'grass',
  'grass_tuft_a',
  'grass_tuft_b',
  'grass_tuft_c',
  'grass_dark',
  'soil',
  'soil_pebble_a',
  'soil_pebble_b',
  'sand',
] as const

export type GroundName = (typeof GROUND)[number]

/** Index of a ground tile by name, so motifs read as words not numbers. */
const g = (name: GroundName): number => GROUND.indexOf(name)

/**
 * Which ground covers which, indexed by ground tile.
 *
 * Ground types are not peers: where two meet, one of them visibly grows over
 * the other, and it is always the same one. Soil is the bare bottom, sand
 * drifts across it, and both grasses close over the top. Ranking them settles
 * every boundary the same way round, so a farm never shows sand overlapping
 * grass on one edge and grass overlapping sand on the other.
 *
 * A tile's variants share its rank -- the three grass tufts are still grass --
 * so the tufts scattered through a patch never punch holes in their own rim.
 *
 * The numbers line up with scripts/build-sprites.ts TRANSITION_MATERIALS,
 * which writes one rim set per rank above soil, in this order.
 */
export const MATERIAL_RANK: readonly number[] = GROUND.map(name => {
  switch (name) {
    case 'soil':
    case 'soil_pebble_a':
    case 'soil_pebble_b':
      return 0
    case 'sand':
      return 1
    case 'grass_dark':
      return 2
    default:
      return 3
  }
})

/** Soil is the bottom of the stack and has no rim of its own. */
export const LOWEST_RANK = 0

/**
 * Where this rank's thirteen pictures start in transitions.png.
 * Soil has no set, so the sheet begins at rank 1.
 */
export function transitionMaterial(rank: number): number {
  return rank - 1
}

export type MotifName = 'river' | 'treeline' | 'grass' | 'pasture' | 'rocky' | 'mixed'

export const MOTIF_NAMES: readonly MotifName[] =
  ['river', 'treeline', 'grass', 'pasture', 'rocky', 'mixed'] as const

export type ScatterKind = 'tree' | 'prop'

export type Motif = {
  name: MotifName
  /** Which ground tile this cell shows. */
  ground(depth: number, border: number, r: number): number
  /** Whether this cell is open water. */
  water(depth: number, border: number, r: number): boolean
  /** What, if anything, stands on this cell. */
  scatter(depth: number, border: number, r: number): ScatterKind | null
}

/** Grass with a scattering of tufts, so a plain edge is not a flat rectangle. */
function grassy(r: number): number {
  if (r < 0.62) return g('grass')
  if (r < 0.75) return g('grass_tuft_a')
  if (r < 0.88) return g('grass_tuft_b')
  return g('grass_tuft_c')
}

/**
 * How far from the fence this cell is: 0 against the fence, 1 at the far edge
 * of the generated world.
 *
 * Every motif is written against THIS rather than against `depth`, and that is
 * the whole reason the scenery survived being made twenty times bigger. The
 * motifs used to test `depth === 0` — the outermost ring — which is a sensible
 * thing to say about a three-tile border and a meaningless one about a
 * forty-tile world: it put a single row of trees at the edge of the screen and
 * left a flat slab of nothing between there and the field.
 *
 * Read as a fraction, a motif describes the same picture at any size: the
 * farm is a clearing, its own margin sits against the fence, and the country
 * gets wilder the further out you look.
 */
function wildness(depth: number, border: number): number {
  if (border <= 1) return 0
  return 1 - depth / (border - 1)
}

const MOTIFS: Record<MotifName, Motif> = {
  // A watercourse along the far side, its bank, then grass on the way in. This
  // is the only motif that produces water, which is what makes a dry farm
  // start no animation loop at all.
  river: {
    name: 'river',
    ground: (depth, border, r) => {
      const w = wildness(depth, border)
      if (w > 0.72) return g('sand')
      return grassy(r)
    },
    water: (depth, border) => wildness(depth, border) > 0.86,
    scatter: (depth, border, r) => {
      const w = wildness(depth, border)
      if (w > 0.70) return null                      // the bank stays clear
      if (r < 0.16 * w) return 'tree'
      return r < 0.09 ? 'prop' : null
    },
  },

  // Woodland thinning towards the clearing. Dense at the edge of the world,
  // nothing at all against the fence.
  treeline: {
    name: 'treeline',
    ground: (depth, border, r) => grassy(r),
    water: () => false,
    scatter: (depth, border, r) => {
      const w = wildness(depth, border)
      if (r < 0.55 * w * w) return 'tree'
      return r < 0.07 ? 'prop' : null
    },
  },

  // Open ground. The quiet option, and the one that lets a busy farm breathe.
  grass: {
    name: 'grass',
    ground: (depth, border, r) => grassy(r),
    water: () => false,
    scatter: (depth, border, r) => {
      const w = wildness(depth, border)
      if (r < 0.12 * w * w) return 'tree'
      return r < 0.08 ? 'prop' : null
    },
  },

  // Darker grazing land, cropped short, with the odd shrub.
  pasture: {
    name: 'pasture',
    ground: (depth, border, r) => (r < 0.55 ? g('grass_dark') : grassy(r)),
    water: () => false,
    scatter: (depth, border, r) => {
      const w = wildness(depth, border)
      if (r < 0.10 * w * w) return 'tree'
      return r < 0.12 ? 'prop' : null
    },
  },

  // Stony margin: the strip that never got cleared, right against the fence,
  // giving way to scrub further out.
  rocky: {
    name: 'rocky',
    ground: (depth, border, r) => {
      const w = wildness(depth, border)
      if (w > 0.45) return grassy(r)                 // beyond the margin
      if (r < 0.45) return g('soil')
      if (r < 0.70) return g('soil_pebble_a')
      if (r < 0.85) return g('soil_pebble_b')
      return g('sand')
    },
    water: () => false,
    scatter: (depth, border, r) => {
      const w = wildness(depth, border)
      if (r < 0.14 * w * w) return 'tree'
      return r < 0.16 ? 'prop' : null
    },
  },

  // Worked ground giving way to grass, the commonest field margin.
  mixed: {
    name: 'mixed',
    ground: (depth, border, r) => {
      const w = wildness(depth, border)
      if (w < 0.22) return r < 0.5 ? g('soil') : g('soil_pebble_a')
      return grassy(r)
    },
    water: () => false,
    scatter: (depth, border, r) => {
      const w = wildness(depth, border)
      if (r < 0.30 * w * w) return 'tree'
      return r < 0.09 ? 'prop' : null
    },
  },
}

export function motif(name: MotifName): Motif {
  return MOTIFS[name]
}

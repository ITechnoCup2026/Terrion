// The picture files the terrain layer stamps from, loaded once and reused.
//
// Same contract as crops.ts: this resolves to null rather than rejecting. The
// scenery is explicitly the first thing to cut if anything slips, so a missing
// or failed sheet has to leave the canvas rendering today's clean grid with
// every flow still working -- not throw inside a render pass.

import { PIECE_COUNT as TRANSITION_PIECES } from '@/lib/terrain/autotile'

/** Ground, water, fence and props are one tile; trees and the house are 2x2. */
export const TERRAIN_TILE = 32
export const TREE_CELL = 64
export const HOUSE_CELL = 64

export type TerrainSheets = {
  ground: HTMLImageElement
  water: HTMLImageElement
  fence: HTMLImageElement
  trees: HTMLImageElement
  props: HTMLImageElement
  house: HTMLImageElement
  /** Thirteen rim pieces per material, in lib/terrain/autotile.ts PIECE order. */
  transitions: HTMLImageElement
  /** Counts read from the sheets themselves, so adding art needs no code change. */
  waterFrames: number
  treeCount: number
  propCount: number
  groundCount: number
  transitionMaterials: number
}

let cached: Promise<TerrainSheets | null> | null = null

// One image, or null if it will not load.
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') return resolve(null)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Loads every terrain sheet once; null if any of them is missing. */
export function loadTerrainSheets(): Promise<TerrainSheets | null> {
  if (cached) return cached

  cached = (async () => {
    const [ground, water, fence, trees, props, house, transitions] = await Promise.all([
      loadImage('/sprites/ground.png'),
      loadImage('/sprites/water.png'),
      loadImage('/sprites/fence.png'),
      loadImage('/sprites/trees.png'),
      loadImage('/sprites/props.png'),
      loadImage('/sprites/house.png'),
      loadImage('/sprites/transitions.png'),
    ])

    // All or nothing. A half-loaded set would draw a border with no ground
    // under it, which looks broken in a way a missing border does not.
    if (!ground || !water || !fence || !trees || !props || !house || !transitions) return null

    return {
      ground, water, fence, trees, props, house, transitions,
      waterFrames: Math.max(1, Math.round(water.width / TERRAIN_TILE)),
      treeCount: Math.max(1, Math.round(trees.width / TREE_CELL)),
      propCount: Math.max(1, Math.round(props.width / TERRAIN_TILE)),
      groundCount: Math.max(1, Math.round(ground.width / TERRAIN_TILE)),
      transitionMaterials: Math.max(
        1, Math.round(transitions.width / TERRAIN_TILE / TRANSITION_PIECES)),
    }
  })()

  return cached
}

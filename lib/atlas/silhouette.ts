import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { INDONESIA_BBOX, project } from './projection'

/**
 * The archipelago as line art, for the landing hero.
 *
 * Real geography rather than a decorative squiggle, and it costs no asset:
 * `public/geo/provinces.geojson` already ships for the Atlas. What it must not
 * cost is the first paint of the public landing page — the file is 220 kB of
 * coordinates, and inlining all of it as SVG paths would put more geometry in
 * the HTML than there is copy.
 *
 * So it is decimated hard. At the size this renders, a point every ~9 km is
 * already finer than a pixel, and islands smaller than a quarter of a degree
 * are a speck. What survives is the shape everyone recognises.
 *
 * Read and simplified ONCE per server process, then reused. Doing it per
 * request would parse a quarter of a megabyte of JSON to draw the same picture
 * every time.
 */

/** Minimum spacing between kept points, in degrees — about 13 km, which is
 *  roughly three pixels at the size the hero draws this. */
const MIN_STEP = 0.12

/** Islands whose bounding box is smaller than this are dropped. */
const MIN_RING = 0.4

export type ProvinceShape = { name: string; d: string }

export type Archipelago = {
  shapes: ProvinceShape[]
  /** Sized to INDONESIA_BBOX in the same space `project` uses. */
  viewBox: string
}

type Ring = [number, number][]

/** The longer side of a ring's bounding box, in degrees. */
function ringSize(ring: Ring): number {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  return Math.max(maxLng - minLng, maxLat - minLat)
}

/** One ring to an SVG path, thinned. Null when nothing worth drawing is left.
 *  `force` skips the size test, for a province that would otherwise vanish. */
function ringPath(ring: Ring, force = false): string | null {
  if (!force && ringSize(ring) < MIN_RING) return null

  const kept: Ring = []
  let last: [number, number] | null = null
  for (const point of ring) {
    if (last && Math.hypot(point[0] - last[0], point[1] - last[1]) < MIN_STEP) continue
    kept.push(point)
    last = point
  }
  // Three points is the least that encloses anything.
  if (kept.length < 3) return null

  const at = (p: [number, number]) => {
    const { x, y } = project(p)
    return `${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return `M${at(kept[0])}L${kept.slice(1).map(at).join('L')}Z`
}

/** Every ring in a Polygon or MultiPolygon geometry. */
function ringsOf(geometry: { type: string; coordinates: unknown }): Ring[] {
  if (geometry.type === 'Polygon') return geometry.coordinates as Ring[]
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as Ring[][]).flat()
  }
  return []
}

let cached: Promise<Archipelago> | null = null

export function archipelago(): Promise<Archipelago> {
  cached ??= build()
  return cached
}

async function build(): Promise<Archipelago> {
  const file = path.join(process.cwd(), 'public', 'geo', 'provinces.geojson')
  const raw = await readFile(file, 'utf8')
  const geo = JSON.parse(raw) as {
    features: { properties: { name: string }; geometry: { type: string; coordinates: unknown } }[]
  }

  const shapes: ProvinceShape[] = []
  for (const feature of geo.features) {
    const rings = ringsOf(feature.geometry)
    let d = rings.map(r => ringPath(r)).filter((p): p is string => p !== null).join('')

    // A small province -- DKI Jakarta is the one -- can have every ring fall
    // under the island threshold and disappear entirely. A province missing
    // from a map of Indonesia is wrong even in decoration, so its largest ring
    // goes in regardless of size.
    if (!d && rings.length > 0) {
      const largest = rings.reduce((a, b) => (ringSize(a) >= ringSize(b) ? a : b))
      d = ringPath(largest, true) ?? ''
    }

    if (d) shapes.push({ name: feature.properties.name, d })
  }

  const a = project([INDONESIA_BBOX[0], INDONESIA_BBOX[1]])
  const b = project([INDONESIA_BBOX[2], INDONESIA_BBOX[3]])
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y)
  const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y)

  return { shapes, viewBox: `${x} ${y} ${w} ${h}` }
}

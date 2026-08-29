// Turning longitude and latitude into SVG coordinates, and a bounding box into
// a viewBox the map can fly to.
//
// Deliberately not a projection library. Indonesia spans about 46 degrees of
// longitude either side of the equator, where a plate carrée projection's
// distortion is small and, more to the point, uniform — the Atlas is a
// navigation surface, not a survey instrument, and nothing here is measured off
// the picture. A projection dependency would add weight to the first paint of
// the public landing page to fix an error nobody can see.
//
// The one correction that IS applied: latitude is scaled by a constant so the
// country is not visibly stretched vertically at this latitude band.

/** [minLng, minLat, maxLng, maxLat] — the order GeoJSON uses. */
export type Bbox = [number, number, number, number]

export type Point = { x: number; y: number }

/** The archipelago, with a little air around it. */
export const INDONESIA_BBOX: Bbox = [94.5, -11.5, 141.5, 6.5]

// Latitude degrees are longer than longitude degrees away from the equator.
// Near Indonesia the ratio is close to 1, but a flat 1:1 still reads as
// slightly squashed, and this is cheaper than a real projection.
const LAT_SCALE = 1.06

/** One coordinate pair to SVG space. */
export function project([lng, lat]: [number, number]): Point {
  // y is negated because SVG's y axis grows downward and latitude grows up.
  return { x: lng, y: -lat * LAT_SCALE }
}

/** Grow a bbox by a fraction of its own size, keeping its centre. */
export function padBbox(box: Bbox, fraction: number): Bbox {
  const [minLng, minLat, maxLng, maxLat] = box
  // A degenerate box has no size to take a fraction of, so it falls back to a
  // fixed span — otherwise padding a single point pads by nothing.
  const padLng = Math.max((maxLng - minLng) * fraction, 0.02)
  const padLat = Math.max((maxLat - minLat) * fraction, 0.02)
  return [minLng - padLng, minLat - padLat, maxLng + padLng, maxLat + padLat]
}

/** The smallest box containing both, ignoring nulls. */
export function unionBbox(a: Bbox | null, b: Bbox | null): Bbox | null {
  if (!a) return b
  if (!b) return a
  return [
    Math.min(a[0], b[0]), Math.min(a[1], b[1]),
    Math.max(a[2], b[2]), Math.max(a[3], b[3]),
  ]
}

/**
 * A viewBox that contains `box` at the given aspect ratio.
 *
 * The box is grown, never cropped: a regency that is taller than the viewport
 * gains width so it still fits, because clipping the thing somebody just
 * clicked on is the one outcome a zoom must not produce.
 */
export function fitViewBox(box: Bbox, aspect: number): string {
  const [minLng, minLat, maxLng, maxLat] = box
  const topLeft = project([minLng, maxLat])
  const bottomRight = project([maxLng, minLat])

  // A cooperative with a single plot yields a zero-size box; give it a minimum
  // extent rather than dividing by zero further down.
  let width = Math.max(bottomRight.x - topLeft.x, 1e-4)
  let height = Math.max(bottomRight.y - topLeft.y, 1e-4)
  const centreX = topLeft.x + width / 2
  const centreY = topLeft.y + height / 2

  if (width / height < aspect) width = height * aspect
  else height = width / aspect

  return `${centreX - width / 2} ${centreY - height / 2} ${width} ${height}`
}

/** A GeoJSON ring as an SVG path fragment. */
function ringToPath(ring: [number, number][]): string {
  let d = ''
  for (let i = 0; i < ring.length; i++) {
    const { x, y } = project(ring[i])
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(4)} ${y.toFixed(4)}`
  }
  return d ? `${d}Z` : ''
}

/**
 * A Polygon or MultiPolygon as one `d` attribute.
 *
 * Every ring of every polygon goes into a single path so an island chain is one
 * DOM node rather than four hundred. Interior rings (holes) come through in the
 * same string and render correctly under the default even-odd-ish fill rule.
 */
export function geometryToPath(geometry: {
  type: string
  coordinates: unknown
}): string {
  if (geometry.type === 'Polygon') {
    return (geometry.coordinates as [number, number][][]).map(ringToPath).join('')
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as [number, number][][][])
      .flat()
      .map(ringToPath)
      .join('')
  }
  return ''
}

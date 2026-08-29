// Plots share weather by grid cell: one download serves every plot in the cell.

export const GRID_STEP = 0.25

// Round half away from zero, matching Postgres round() on numeric. Math.round
// rounds half toward +infinity instead, which disagrees on every negative
// .125 boundary — and Indonesian latitudes are negative.
function roundHalfAwayFromZero(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x))
}

// Snap a coordinate onto the weather grid. Must agree exactly with the
// plot.grid_lat / grid_lng generated columns, or weather joins return nothing.
export function snapToGrid(lat: number, lng: number): { gridLat: number; gridLng: number } {
  // Adding zero normalises -0 to 0; Postgres numeric has no negative zero.
  return {
    gridLat: roundHalfAwayFromZero(lat / GRID_STEP) * GRID_STEP + 0,
    gridLng: roundHalfAwayFromZero(lng / GRID_STEP) * GRID_STEP + 0,
  }
}

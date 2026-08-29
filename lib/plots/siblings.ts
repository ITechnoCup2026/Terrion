/**
 * Where one plot sits among the others its cooperative has registered.
 *
 * The public plot page used to be a leaf: you arrived from the Atlas or from a
 * shared link, and the only way to another plot in the same village was back
 * out to the map and in again. This is what lets a reader walk the cooperative
 * one field at a time.
 *
 * Pure, so the ordering and the edges are testable without a database. The
 * list is whatever `loadCooperativePlots` returns, and it is already sorted --
 * position in it is the only thing "previous" and "next" can honestly mean.
 */

export type PlotNeighbour = {
  publicId: string
  name: string
  memberName: string
  areaHa: number
}

export type Neighbours = {
  /** 1-based position, or 0 when the plot is not in the list. */
  position: number
  total: number
  previous: PlotNeighbour | null
  next: PlotNeighbour | null
  /** Every other plot, in order, for the "lahan lain" list. */
  others: PlotNeighbour[]
}

/**
 * The plots either side of `publicId`.
 *
 * Deliberately does NOT wrap. A "next" on the last plot that lands back on the
 * first tells the reader they have reached the end by silently starting over,
 * which is the one thing an end marker exists to prevent. The ends are ends.
 *
 * A plot missing from its own list is not an error worth throwing over -- the
 * page still renders, it simply offers no neighbours.
 */
export function neighboursOf(list: PlotNeighbour[], publicId: string): Neighbours {
  const index = list.findIndex(p => p.publicId === publicId)

  if (index < 0) {
    return { position: 0, total: list.length, previous: null, next: null, others: list }
  }

  return {
    position: index + 1,
    total: list.length,
    previous: index > 0 ? list[index - 1] : null,
    next: index < list.length - 1 ? list[index + 1] : null,
    others: list.filter((_, i) => i !== index),
  }
}

/**
 * The market reference for a block that is still in the ground.
 *
 * Two prices, never one. `latest` is where the panel has the market today;
 * `seasonal` is the same week of the year the harvest window opens, a year
 * back. Neither answers "what will I get" -- nothing can -- but the pair
 * answers the question a farmer actually has before they commit to a buyer:
 * does my window open into a seasonal high or a seasonal low?
 */
export type WeekPrice = {
  pricePerKg: number
  weekStart: Date
}

export type PriceBenchmark = {
  latest: WeekPrice
  /** Null when the panel published no matching week. */
  seasonal: WeekPrice | null
  /** Whose panel this is. Shown, always -- the seeded panel is synthetic. */
  source: string
}

/**
 * Where the harvest week sat against today's market, as a fraction of today's.
 *
 * Positive means that week ran above the current level a year ago, so the
 * window opens into a seasonally stronger patch. Divided by `latest` rather
 * than by `seasonal` because today's price is the number the farmer is being
 * offered -- the comparison has to be expressed against what they can see.
 *
 * Null when there is no seasonal week, and when the latest price is zero: a
 * panel row at zero is bad data, not a hundred-percent swing.
 */
export function seasonalGap(benchmark: PriceBenchmark): number | null {
  if (!benchmark.seasonal || benchmark.latest.pricePerKg <= 0) return null
  return (benchmark.seasonal.pricePerKg - benchmark.latest.pricePerKg)
    / benchmark.latest.pricePerKg
}

/**
 * The gap as a signed percentage: `+6%`, `−4%`, `0%`.
 *
 * A real minus sign, not a hyphen, and rounded to whole percent. The panel is
 * weekly and provincial; a tenth of a percent on it is noise dressed as
 * precision.
 */
export function formatSeasonalGap(gap: number): string {
  const percent = Math.round(gap * 100)
  if (percent === 0) return '0%'
  return percent > 0 ? `+${percent}%` : `−${Math.abs(percent)}%`
}

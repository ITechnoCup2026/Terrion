import { cn } from '@/lib/utils'

/**
 * A figure's own shape, beside the figure.
 *
 * Every headline number on these screens was a number and nothing else — the
 * total for twelve weeks, the peak week, the count of weeks over capacity —
 * while the series each one summarises was already loaded on the page. A total
 * tells you how much; the shape tells you whether it arrives evenly or all in
 * one week, which for a cooperative deciding whether to stagger is the whole
 * question. Printing only the total throws that away and leaves a dashboard
 * that reads as a spreadsheet.
 *
 * Bars, not a line. These are weekly buckets — twelve discrete measurements,
 * not samples of a continuous signal — and a line drawn through them implies
 * values between the weeks that do not exist. It is also the same form as the
 * full projection chart lower down the page, so the small picture and the
 * large one are the same picture.
 *
 * `aria-hidden`, deliberately: the figure it sits beside and the line under it
 * already say this in words, and a screen reader announcing twelve unlabelled
 * numbers would be noise rather than a second channel.
 */
export function Sparkbars({
  values,
  /** Drawn in full ink — the week the figure beside this is naming. */
  highlight,
  /** Weeks over capacity. Gold here means what gold means everywhere. */
  flagged,
  className,
}: {
  values: readonly number[]
  highlight?: number
  flagged?: readonly boolean[]
  className?: string
}) {
  if (values.length === 0) return null

  const peak = Math.max(...values)

  return (
    <span
      aria-hidden
      className={cn('flex h-8 items-end gap-[2px]', className)}
    >
      {values.map((value, i) => {
        // A zero week keeps a baseline tick rather than vanishing: a gap in the
        // bars would read as "no data for this week", which is a different
        // claim from "nothing is due this week".
        const height = peak > 0 ? Math.max((value / peak) * 100, 6) : 6
        const isFlagged = flagged?.[i] ?? false

        return (
          <span
            key={i}
            className={cn(
              'w-full min-w-[2px] rounded-[1px]',
              isFlagged
                ? 'bg-accent'
                : i === highlight
                  ? 'bg-[var(--terrion-green-900)]'
                  : 'bg-[var(--terrion-green-500)]',
            )}
            style={{ height: `${height}%` }}
          />
        )
      })}
    </span>
  )
}

/**
 * A quantity as a share of the largest one on screen.
 *
 * The reference for this is the score column in a product table: a number is
 * hard to place until you can see it against its neighbours, and a four-pixel
 * bar does that in the width a number already occupies. Used where a set of
 * rows is genuinely comparable — tonnage across listings, fertiliser across
 * the RDKK lines — and nowhere a row stands alone, where "share of one" is
 * meaningless.
 */
export function ShareBar({
  value,
  max,
  colour,
  className,
}: {
  value: number
  max: number
  /** Defaults to the interface green; a crop passes its own hue. */
  colour?: string
  className?: string
}) {
  const share = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0

  return (
    <span
      aria-hidden
      className={cn('block h-1 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <span
        className="block h-full rounded-full"
        style={{ width: `${share * 100}%`, background: colour ?? 'var(--primary)' }}
      />
    </span>
  )
}

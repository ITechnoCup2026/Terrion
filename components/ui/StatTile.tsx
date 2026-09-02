import { formatNumberId } from '@/lib/format/number'
import { cn } from '@/lib/utils'

/**
 * One dashboard figure, with an honest empty state.
 *
 * `value === null` means "not measured this season" and renders as such. It
 * must never fall back to `0`: a cooperative that moved zero tonnes and one
 * that has not yet recorded a harvest are different claims, and only one of
 * them is something we know. `computeImpact` returns `null` deliberately for
 * exactly this reason — collapsing it here would throw that away.
 */
export function StatTile({
  label,
  value,
  unit,
  hint,
  emptyHint,
  decimals = 1,
  formatValue,
  className,
}: {
  label: string
  value: number | null
  unit?: string
  /** One line naming where the number came from, so it can be traced. */
  hint?: string
  /** What would fill this tile, shown in place of `hint` while the value is
   *  null. A tile that only says "no data" reads as broken; one that names the
   *  event that fills it reads as a figure waiting on evidence, which is what
   *  it actually is. */
  emptyHint?: string
  decimals?: number
  /** Override the rendering of a present value — currency, for instance.
   *  Deliberately does not receive `null`: deciding what absence looks like
   *  stays here, so no caller can accidentally render a missing figure as 0. */
  formatValue?: (value: number) => string
  className?: string
}) {
  const empty = value === null

  return (
    // An empty tile is drawn as empty: dashed and unfilled. Four tiles in a
    // row, two of them carrying a figure and two of them not, were previously
    // four identical cards -- so "belum ada data" had to be READ rather than
    // seen, and the panel looked like four measurements at a glance when it
    // was two.
    <div
      className={cn(
        'rounded-lg border p-4',
        empty ? 'border-dashed border-border bg-muted/40' : 'border-border bg-card',
        className,
      )}
    >
      {/* Sentence case. A tracked-out capitalised label makes the quietest
          text on the tile the loudest thing on it. */}
      <p className="text-xs text-muted-foreground">{label}</p>

      {empty ? (
        <p className="mt-2 text-xs text-[var(--terrion-ink-faint)]">
          Belum ada data musim ini
        </p>
      ) : (
        <p className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl leading-none font-medium tracking-tight tabular-nums text-foreground">
            {formatValue ? formatValue(value) : formatNumberId(value, decimals)}
          </span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </p>
      )}

      {/* Provenance of a number that is not there is noise -- while the tile is
          empty its own unlock condition is the more useful sentence. */}
      {(empty ? emptyHint ?? hint : hint) && (
        <p className="mt-2 text-[0.6875rem] leading-snug text-[var(--terrion-ink-faint)]">
          {empty ? emptyHint ?? hint : hint}
        </p>
      )}
    </div>
  )
}

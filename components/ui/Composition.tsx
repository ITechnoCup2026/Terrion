import { cn } from '@/lib/utils'

/**
 * A set of quantities as one bar, then as a list that names its own shares.
 *
 * For a part-to-whole this is strictly more than a column of numbers. The
 * fertiliser table read "Kcl 0,3 ton / Npk 0,4 ton / Sp36 0,4 ton / Urea 1,3
 * ton", and to learn the thing a pengurus actually wants — that urea is more
 * than half the order and the other three together are the rest — you had to
 * add four figures up in your head. The bar says it before the row is read,
 * and the percentages let it be quoted in a meeting.
 *
 * Segments in one hue at descending lightness rather than four colours: these
 * are four parts of one quantity, not four categories that stand alone, and
 * giving each its own hue would imply a difference in kind that is not there.
 * The order is heaviest first, so the ramp reads left to right.
 */

/** Descending lightness, so the largest share is also the darkest segment. */
const STEPS = ['#1a5f3c', '#2e9e5b', '#7fc39a', '#b9d9c4', '#d5e9dd'] as const

export type CompositionPart = {
  key: string
  label: string
  /** What to print for this part — "1,3 ton", "Rp 4,2 jt". */
  value: string
  /** A second figure for the same part, when the row carries two — the
   *  requirement and what actually gets ordered, say. */
  secondary?: string
  /** The number the share is computed from. */
  amount: number
}

export function Composition({
  parts,
  className,
}: {
  parts: readonly CompositionPart[]
  className?: string
}) {
  const total = parts.reduce((sum, part) => sum + part.amount, 0)
  if (parts.length === 0 || total <= 0) return null

  const ranked = [...parts].sort((a, b) => b.amount - a.amount)
  const colourOf = (index: number) => STEPS[Math.min(index, STEPS.length - 1)]

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div aria-hidden className="flex h-2 overflow-hidden rounded-full">
        {ranked.map((part, i) => (
          <span
            key={part.key}
            className="h-full"
            style={{ width: `${(part.amount / total) * 100}%`, background: colourOf(i) }}
          />
        ))}
      </div>

      <dl className="flex flex-col">
        {ranked.map((part, i) => (
          <div
            key={part.key}
            className="flex items-baseline gap-2 border-b border-border py-2 last:border-b-0"
          >
            <span
              aria-hidden
              className="size-2 shrink-0 translate-y-[-1px] rounded-full"
              style={{ background: colourOf(i) }}
            />
            <dt className="min-w-0 truncate text-[0.8125rem] text-foreground capitalize">
              {part.label}
            </dt>
            {/* The leader dots are what let the eye run from a name on the left
                to its figure on the right across a wide panel. */}
            <span aria-hidden className="mx-1 h-px flex-1 self-center bg-border" />
            <dd className="shrink-0 text-[0.8125rem] tabular-nums text-muted-foreground">
              {part.value}
            </dd>
            {part.secondary && (
              <dd className="w-24 shrink-0 text-right text-[0.8125rem] font-medium tabular-nums text-foreground">
                {part.secondary}
              </dd>
            )}
            <dd className="w-10 shrink-0 text-right text-[0.8125rem] tabular-nums text-[var(--terrion-ink-faint)]">
              {Math.round((part.amount / total) * 100)}%
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

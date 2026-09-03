import { isoWeekStart } from '@/lib/agronomy/dates'
import type { Listing } from '@/lib/catalog/listings'
import { formatNumberId } from '@/lib/format/number'
import { monthTicks, RULER_WEEKS, supplyRows } from '@/lib/supply/ruler'

/**
 * Twelve weeks of national supply, as bands on a calendar.
 *
 * This is the landing page's hero, and it is the product rather than a picture
 * of the product: every band is a real week in which a registered cooperative
 * expects to harvest a real crop. What the page claims in one sentence — that
 * Terrion turns a planting date into a picture of supply — is the thing the
 * reader is looking at while they read the sentence.
 *
 * The form is the argument. Terrion never knows a harvest DATE; it knows a
 * range, derived from accumulated temperature and the weather that actually
 * happened. Drawing that as a band rather than a point is the one honest way
 * to render it, which is why the band recurs in the catalogue, the plot list
 * and the dashboard. A hero built on a big number would be claiming a
 * precision the model does not have.
 *
 * A server component: the arithmetic lives in `lib/landing/ruler`, this is the
 * layout of its result, and the whole thing ships no JavaScript.
 */
export function SupplyRuler({
  listings,
  className,
}: {
  listings: readonly Listing[]
  className?: string
}) {
  const from = isoWeekStart(new Date())
  const rows = supplyRows(listings, from)
  if (rows.length === 0) return null

  const ticks = monthTicks(from)

  return (
    <figure className={className}>
      <div className="overflow-hidden border border-border bg-card rounded-2xl shadow-sm">
        {/* Month Scale Header */}
        <div className="flex h-9 items-center border-b border-border bg-[var(--terrion-green-50)] px-1">
          <span className="w-24 shrink-0 sm:w-36 text-xs font-mono font-semibold uppercase tracking-wider text-[var(--terrion-green-700)] pl-3">
            Komoditas
          </span>
          <span className="relative h-full flex-1">
            {ticks.map(tick => (
              <span
                key={tick.label}
                className="absolute top-2.5 -translate-x-1/2 font-mono text-[0.6875rem] font-medium text-[var(--terrion-ink-faint)] first:translate-x-0"
                style={{ left: `${tick.left}%` }}
              >
                {tick.label}
              </span>
            ))}
          </span>
          <span className="hidden w-24 shrink-0 pr-3 text-right font-mono text-xs font-semibold uppercase tracking-wider text-[var(--terrion-green-700)] sm:block">
            Est. Tonase
          </span>
        </div>

        <ul>
          {rows.map((row, rowIndex) => (
            <li
              key={row.commodity}
              className="interactive flex items-center border-b border-border/70 last:border-b-0 hover:bg-[var(--terrion-green-50)]/60 transition-colors"
            >
              <span className="w-24 shrink-0 truncate py-3 pr-2 pl-4 text-[0.8125rem] font-medium text-foreground sm:w-36 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--terrion-green-600)]" />
                {row.commodity}
              </span>

              <span className="relative h-10 flex-1">
                {/* Week gridlines */}
                {Array.from({ length: RULER_WEEKS - 1 }, (_, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="absolute inset-y-0 w-px bg-border/60"
                    style={{ left: `${((i + 1) / RULER_WEEKS) * 100}%` }}
                  />
                ))}

                {row.runs.map(([start, length]) => (
                  <span
                    key={start}
                    className="band absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-[var(--terrion-green-700)] shadow-xs"
                    style={{
                      left: `${(start / RULER_WEEKS) * 100}%`,
                      width: `${(length / RULER_WEEKS) * 100}%`,
                      ['--band-delay' as string]: `${260 + rowIndex * 80}ms`,
                    }}
                  />
                ))}
              </span>

              <span className="hidden w-24 shrink-0 py-3 pr-4 text-right text-[0.8125rem] font-mono font-medium tabular-nums text-[var(--terrion-green-700)] sm:block">
                {formatNumberId(row.tonnes)} t
              </span>
            </li>
          ))}
        </ul>
      </div>

      <figcaption className="mt-3.5 max-w-2xl text-[0.8125rem] leading-relaxed text-muted-foreground flex items-center gap-2">
        <span className="size-2 rounded-full bg-[var(--terrion-green-500)] inline-block shrink-0" />
        <span>
          Panen yang diproyeksikan koperasi terdaftar untuk 12 minggu ke depan berdasar akumulasi suhu riil.
        </span>
      </figcaption>
    </figure>
  )
}

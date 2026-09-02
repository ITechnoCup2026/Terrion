import { isoWeekStart } from '@/lib/agronomy/dates'
import type { Listing } from '@/lib/catalog/listings'
import { formatNumberId } from '@/lib/format/number'
import { monthTicks, RULER_WEEKS, supplyRows } from '@/lib/landing/ruler'

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
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* The month scale. Absolutely positioned rather than a grid, because
            a month is not a whole number of weeks and rounding it to one puts
            the label a few days from the boundary it names.

            The margins have to match the row below exactly -- the label column
            on the left and the tonnage column on the right. Miss the right one
            and the scale is stretched over the tonnage column, which walks
            every month name a few days later than the week it labels. */}
        <div className="relative ml-24 h-7 border-b border-border sm:mr-20 sm:ml-36">
          {ticks.map(tick => (
            <span
              key={tick.label}
              className="absolute top-2 -translate-x-1/2 text-[0.6875rem] text-[var(--terrion-ink-faint)] first:translate-x-0"
              style={{ left: `${tick.left}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        <ul>
          {rows.map((row, rowIndex) => (
            <li
              key={row.commodity}
              className="flex items-center border-b border-border last:border-b-0"
            >
              <span className="w-24 shrink-0 truncate py-3 pr-2 pl-4 text-[0.8125rem] text-foreground sm:w-36">
                {row.commodity}
              </span>

              <span className="relative h-9 flex-1">
                {/* Week gridlines. Structural, not decorative: without them a
                    band is a length, and with them it is a count of weeks. */}
                {Array.from({ length: RULER_WEEKS - 1 }, (_, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="absolute inset-y-0 w-px bg-border"
                    style={{ left: `${((i + 1) / RULER_WEEKS) * 100}%` }}
                  />
                ))}

                {row.runs.map(([start, length]) => (
                  <span
                    key={start}
                    className="band absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-primary"
                    style={{
                      left: `${(start / RULER_WEEKS) * 100}%`,
                      width: `${(length / RULER_WEEKS) * 100}%`,
                      ['--band-delay' as string]: `${260 + rowIndex * 80}ms`,
                    }}
                  />
                ))}
              </span>

              {/* Dropped on a phone, where the label and tonnage columns
                  together would leave twelve weeks about 150px to live in.
                  Of the three things the row says -- which crop, which weeks,
                  how much -- the tonnage is the one the caption can carry. */}
              <span className="hidden w-20 shrink-0 py-3 pr-4 text-right text-[0.8125rem] tabular-nums text-muted-foreground sm:block">
                {formatNumberId(row.tonnes)} t
              </span>
            </li>
          ))}
        </ul>
      </div>

      <figcaption className="mt-3 max-w-2xl text-[0.8125rem] leading-relaxed text-muted-foreground">
        Panen yang diproyeksikan koperasi terdaftar untuk dua belas minggu ke
        depan. Setiap batang adalah rentang minggu, bukan tanggal — dihitung
        dari akumulasi suhu dan cuaca yang benar-benar terjadi.
      </figcaption>
    </figure>
  )
}

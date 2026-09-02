import { isoWeekStart } from '@/lib/agronomy/dates'
import { commodityStyle } from '@/lib/catalog/commodity-style'
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
 * Each crop draws in its own colour, the one it keeps everywhere else in the
 * product — the same hue on its catalogue card, its plot row and its bar here.
 * Every band was one uniform green for a while, which made the chart of five
 * different crops look like a chart of one thing measured five times. Colour
 * is doing identification here, not decoration, and it is never the only
 * channel: the crop is named on the same line.
 *
 * A server component: the arithmetic lives in `lib/supply/ruler`, this is the
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
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-xs)]">
        {/* The month scale. Absolutely positioned within its track rather
            than laid out on a grid, because a month is not a whole number of
            weeks and rounding it to one puts the label a few days from the
            boundary it names.

            It carries the same spacers as the rows below rather than margins
            tuned to match them: the first version matched only the left one,
            and the scale stretched across the tonnage column and walked every
            month name a few days late. */}
        <div className="flex h-7 items-center border-b border-border">
          <span aria-hidden className="w-24 shrink-0 sm:w-36" />
          <span className="relative h-full flex-1">
            {ticks.map(tick => (
              <span
                key={tick.label}
                className="absolute top-2 -translate-x-1/2 text-[0.6875rem] text-[var(--terrion-ink-faint)] first:translate-x-0"
                style={{ left: `${tick.left}%` }}
              >
                {tick.label}
              </span>
            ))}
          </span>
          <span aria-hidden className="hidden w-20 shrink-0 sm:block" />
        </div>

        <ul>
          {rows.map(row => (
            <li
              key={row.commodity}
              className="flex items-center border-b border-border last:border-b-0"
            >
              <span className="flex w-24 shrink-0 items-center gap-2 py-3 pr-2 pl-4 sm:w-36">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: commodityStyle(row.commodity).hue }}
                />
                <span className="truncate text-[0.8125rem] font-medium text-foreground">
                  {row.commodity}
                </span>
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
                    className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full"
                    style={{
                      left: `${(start / RULER_WEEKS) * 100}%`,
                      width: `${(length / RULER_WEEKS) * 100}%`,
                      background: commodityStyle(row.commodity).hue,
                    }}
                  />
                ))}
              </span>

              {/* Dropped on a phone, where the label and tonnage columns
                  together would leave twelve weeks about 150px to live in.
                  Of the three things the row says -- which crop, which weeks,
                  how much -- the tonnage is the one the caption can carry. */}
              <span className="hidden w-20 shrink-0 py-3 pr-4 text-right text-[0.8125rem] font-medium tabular-nums text-foreground sm:block">
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

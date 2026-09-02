import Link from 'next/link'

import { formatNumberId } from '@/lib/format/number'
import { formatHarvestRange } from '@/lib/harvest/format'
import type { UpcomingHarvest } from '@/lib/dashboard/upcoming'

/**
 * Whose harvest is due in the coming week.
 *
 * The chart says how much; this says whose. A pengurus reading the dashboard
 * on Sunday needs a list of names and villages before Monday, and the leftmost
 * bar of a 12-week chart does not give them one.
 *
 * The dates go through `formatHarvestRange` like every other date in the
 * product, so a range stays a range — a single day here would be the only
 * place in Terrion that pretends to know the day.
 */
export function UpcomingHarvests({
  rows, totalTonnes, hidden,
}: {
  rows: UpcomingHarvest[]
  /** Across every block due, including the ones past the display limit. */
  totalTonnes: number
  /** How many rows the limit cut. */
  hidden: number
}) {
  return (
    <section
      aria-labelledby="upcoming-heading"
      className="flex flex-col rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 id="upcoming-heading" className="text-sm font-medium text-foreground">
            Panen tujuh hari ke depan
          </h2>
          <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
            Siapa yang panen minggu ini
          </p>
        </div>
        {rows.length > 0 && (
          <span className="shrink-0 text-sm tabular-nums text-foreground">
            ± {formatNumberId(totalTonnes)} t
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Tidak ada panen yang jatuh di minggu ini.
        </p>
      ) : (
        <ul className="mt-1 divide-y divide-border">
          {rows.map(row => (
            <li key={row.blockId} className="py-2.5 first:pt-1 last:pb-1">
              <Link
                href={`/plots/${row.plotId}`}
                className="interactive -mx-2 flex items-center justify-between rounded-md p-2 hover:bg-muted"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-medium text-foreground">
                      {row.plotName}
                    </span>
                    <span className="shrink-0 rounded-full border border-border px-1.5 text-[0.65rem] text-muted-foreground">
                      {row.commodityName}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">
                    {row.memberName && `${row.memberName} · `}
                    {formatHarvestRange(row.start, row.end)}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-foreground">
                  ± {formatNumberId(row.tonnes)} t
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          dan {hidden} blok lain minggu ini.{' '}
          <Link href="/plots?panen=30" className="text-primary underline underline-offset-4">
            Lihat semua lahan
          </Link>
        </p>
      )}
    </section>
  )
}

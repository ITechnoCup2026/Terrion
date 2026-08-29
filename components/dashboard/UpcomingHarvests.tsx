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
      className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-xs)]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="upcoming-heading" className="text-sm font-medium text-foreground">
          Panen tujuh hari ke depan
        </h2>
        {rows.length > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            ± {formatNumberId(totalTonnes)} ton
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Tidak ada panen yang jatuh di minggu ini.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map(row => (
            <li key={row.blockId} className="py-2 first:pt-0 last:pb-0">
              <Link
                href={`/plots/${row.plotId}`}
                className="interactive -mx-2 block rounded-lg px-2 py-1 hover:bg-muted"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-foreground">
                    {row.plotName}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    ± {formatNumberId(row.tonnes)} ton
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {row.commodityName}
                  {row.memberName && ` · ${row.memberName}`}
                  {' · '}
                  {formatHarvestRange(row.start, row.end)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          dan {hidden} blok lain minggu ini.{' '}
          <Link href="/plots?panen=30" className="underline underline-offset-2">
            Lihat semua lahan
          </Link>
        </p>
      )}
    </section>
  )
}

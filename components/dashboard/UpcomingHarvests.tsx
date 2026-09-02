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
      className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-xs)] card-lift"
    >
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <h2 id="upcoming-heading" className="text-sm font-semibold text-foreground">
            Panen 7 Hari Ke Depan
          </h2>
          <p className="text-[0.7rem] text-muted-foreground">Daftar petani & estimasi hasil minggu ini</p>
        </div>
        {rows.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
            ± {formatNumberId(totalTonnes)} ton
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Tidak ada panen yang jatuh di minggu ini.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border/60">
          {rows.map(row => (
            <li key={row.blockId} className="py-2.5 first:pt-1 last:pb-1">
              <Link
                href={`/plots/${row.plotId}`}
                className="interactive -mx-2 flex items-center justify-between rounded-lg p-2 hover:bg-muted/70"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {row.plotName}
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.2 text-[0.65rem] font-medium text-muted-foreground">
                      {row.commodityName}
                    </span>
                  </div>
                  <p className="truncate text-[0.7rem] text-muted-foreground mt-0.5">
                    {row.memberName && `${row.memberName} · `}
                    {formatHarvestRange(row.start, row.end)}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  ± {formatNumberId(row.tonnes)} t
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <p className="mt-3 text-xs text-muted-foreground pt-2 border-t border-border/40">
          dan {hidden} blok lain minggu ini.{' '}
          <Link href="/plots?panen=30" className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80">
            Lihat semua lahan →
          </Link>
        </p>
      )}
    </section>
  )
}

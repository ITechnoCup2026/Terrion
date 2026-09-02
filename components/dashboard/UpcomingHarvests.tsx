import Link from 'next/link'

import { EmptyState } from '@/components/ui/EmptyState'
import { ShareBar } from '@/components/ui/Sparkbars'
import { commodityStyle } from '@/lib/catalog/commodity-style'
import type { UpcomingHarvest } from '@/lib/dashboard/upcoming'
import { formatNumberId } from '@/lib/format/number'
import { formatHarvestRange } from '@/lib/harvest/format'

/**
 * Whose harvest is due in the coming week.
 *
 * The chart says how much; this says whose. A pengurus reading the dashboard
 * on Sunday needs a list of names and villages before Monday, and the leftmost
 * interval of a twelve-week projection does not give them one.
 *
 * Each row carries its crop's colour down its left edge. That hue is the same
 * one the crop wears in the catalogue and on a plot page, so a reader who has
 * learned "cabai is rust" finds the chilli rows here without reading a word —
 * which is the whole reason the product assigns crops a colour at all, and the
 * dashboard was spending it on a six-pixel dot.
 *
 * The bar under each tonnage is share of the week, not progress. Seven figures
 * in a column are hard to rank; the same seven with a rule under them are not.
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
  const heaviest = rows.reduce((max, row) => Math.max(max, row.tonnes), 0)

  return (
    <section
      aria-labelledby="upcoming-heading"
      className="flex h-full flex-col rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-xs)]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="upcoming-heading" className="text-sm font-semibold text-foreground">
          Panen tujuh hari ke depan
        </h2>
        {rows.length > 0 && (
          <span className="shrink-0 text-[0.9375rem] font-medium tabular-nums text-foreground">
            ± {formatNumberId(totalTonnes)} t
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Siapa yang panen minggu ini</p>

      {rows.length === 0 ? (
        // flex-1, so a week with nothing due fills the panel instead of
        // leaving it a third the height of the one beside it.
        <EmptyState
          className="mt-4 flex-1"
          title="Tidak ada panen minggu ini"
          description="Blok berikutnya muncul di sini begitu jendela panennya masuk tujuh hari ke depan."
        />
      ) : (
        <ul className="mt-4 flex flex-col">
          {rows.map(row => {
            const crop = commodityStyle(row.commodityName)
            return (
              <li key={row.blockId}>
                <Link
                  href={`/plots/${row.plotId}`}
                  className="interactive -mx-2 flex items-start gap-3 rounded-md border-b border-border px-2 py-2.5 hover:bg-muted"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 h-8 w-[3px] shrink-0 rounded-full"
                    style={{ background: crop.hue }}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] font-medium text-foreground">
                      {row.plotName}
                    </span>
                    {/* The crop's hue rides the edge bar and the share rule,
                        both graphics held to the 3:1 rule. It does NOT tint
                        this line: half the crop palette is a mid-tone that
                        fails contrast as 11px text on white. */}
                    <span className="mt-0.5 block truncate text-[0.6875rem] text-muted-foreground">
                      {row.commodityName}
                      {row.memberName && ` · ${row.memberName}`}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.6875rem] text-[var(--terrion-ink-faint)]">
                      {formatHarvestRange(row.start, row.end)}
                    </span>
                  </span>

                  <span className="w-16 shrink-0 pt-0.5">
                    <span className="block text-right text-[0.8125rem] tabular-nums text-foreground">
                      ± {formatNumberId(row.tonnes)} t
                    </span>
                    <ShareBar
                      value={row.tonnes}
                      max={heaviest}
                      colour={crop.hue}
                      className="mt-1.5"
                    />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {hidden > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          dan {hidden} blok lain minggu ini.{' '}
          <Link href="/plots?panen=30" className="text-primary underline underline-offset-4">
            Lihat semua lahan
          </Link>
        </p>
      )}
    </section>
  )
}

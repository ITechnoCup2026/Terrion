import Link from 'next/link'

import { EmptyState } from '@/components/ui/EmptyState'
import { ShareBar } from '@/components/ui/Sparkbars'
import { commodityStyle } from '@/lib/catalog/commodity-style'
import type { UpcomingHarvest } from '@/lib/dashboard/upcoming'
import { formatNumberId } from '@/lib/format/number'
import { formatHarvestRange } from '@/lib/harvest/format'

export function UpcomingHarvests({
  rows, totalTonnes, hidden,
}: {
  rows: UpcomingHarvest[]
  totalTonnes: number
  hidden: number
}) {
  const heaviest = rows.reduce((max, row) => Math.max(max, row.tonnes), 0)

  return (
    <section
      aria-labelledby="upcoming-heading"
      className="panel flex h-full flex-col p-6 justify-between"
    >
      <div>
        <div className="flex items-baseline justify-between gap-3 border-b border-border/80 pb-3.5">
          <div>
            <h2 id="upcoming-heading" className="text-base font-bold tracking-tight text-foreground">
              Panen 7 Hari Ke Depan
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Siapa yang panen minggu ini</p>
          </div>

          {rows.length > 0 && (
            <span className="badge-tag">
              ± {formatNumberId(totalTonnes)} t
            </span>
          )}
        </div>


        {rows.length === 0 ? (
          <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-xl border border-[#e1e9dc] bg-[var(--terrion-green-50)]/40 p-8 text-center">
            <span className="text-xs font-semibold text-[var(--terrion-green-900)]">Tidak ada panen minggu ini</span>
            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Blok berikutnya muncul di sini begitu jendela panennya masuk tujuh hari ke depan.
            </p>
          </div>
        ) : (

          <ul className="mt-4 flex flex-col divide-y divide-border/60">
            {rows.map(row => {
              const crop = commodityStyle(row.commodityName)
              return (
                <li key={row.blockId}>
                  <Link
                    href={`/plots/${row.plotId}`}
                    className="interactive flex items-start gap-3 rounded-lg p-2.5 hover:bg-[var(--terrion-green-50)]/70 transition-colors"
                  >
                    <span
                      aria-hidden
                      className="mt-1 h-7 w-1 shrink-0 rounded-full"
                      style={{ background: crop.hue }}
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-foreground">
                        {row.plotName}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.6875rem] text-muted-foreground">
                        {row.commodityName}
                        {row.memberName && ` · ${row.memberName}`}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.6875rem] text-[var(--terrion-ink-faint)] font-mono">
                        {formatHarvestRange(row.start, row.end)}
                      </span>
                    </span>

                    <span className="w-18 shrink-0 pt-0.5">
                      <span className="block text-right text-xs font-semibold tabular-nums text-foreground">
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
      </div>

      {hidden > 0 && (
        <p className="mt-4 border-t border-border/80 pt-3 text-xs text-muted-foreground">
          dan {hidden} blok lain minggu ini.{' '}
          <Link href="/plots?panen=30" className="text-[var(--terrion-green-700)] font-semibold hover:underline">
            Lihat semua lahan →
          </Link>
        </p>
      )}
    </section>
  )
}




import { ProjectionChart, type ChartWeek } from '@/components/dashboard/ProjectionChart'
import { formatNumberId } from '@/lib/format/number'
import { formatHarvestRange } from '@/lib/harvest/format'
import { cn } from '@/lib/utils'

const WEEK_MS = 7 * 86_400_000

export type ProjectionPanelProps = {
  weeks: ChartWeek[]
  totalTonnes: number
  peak: { tonnes: number; min: number; max: number; weekStart: Date } | null
  flaggedCount: number
  plotCount: number
  overCapacity: { commodityName: string; percentOfCapacity: number } | null
}

export function ProjectionPanel({
  weeks, totalTonnes, peak, flaggedCount, plotCount, overCapacity,
}: ProjectionPanelProps) {
  const ledger = [
    { label: 'Panen 12 minggu', value: `${formatNumberId(totalTonnes)} t` },
    {
      label: 'Minggu padat',
      value: formatNumberId(flaggedCount),
      tone: flaggedCount > 0 ? ('accent' as const) : undefined,
    },
    { label: 'Lahan terdaftar', value: formatNumberId(plotCount) },
  ]

  return (
    <section
      aria-labelledby="projection-heading"
      className="panel overflow-hidden grid lg:grid-cols-[17rem_minmax(0,1fr)]"
    >
      {/* Caption column with landing page wash ground */}
      <div className="flex flex-col justify-between border-b border-border bg-[var(--terrion-green-50)]/70 p-6 lg:border-r lg:border-b-0">
        <div>
          <p className="text-[0.6875rem] font-mono tracking-wider uppercase text-muted-foreground">PUNCAK PANEN</p>

          {peak ? (
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    'text-[3rem] leading-none font-bold tracking-tight tabular-nums',
                    overCapacity ? 'text-accent' : 'text-[var(--terrion-green-700)]',
                  )}
                >
                  {formatNumberId(peak.tonnes)}
                </span>
                <span className="text-sm font-semibold text-[var(--terrion-green-700)]">ton</span>
              </div>

              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[var(--terrion-green-100)]/80 px-2 py-0.5 text-xs font-medium text-[var(--terrion-green-900)]">
                rentang {formatNumberId(peak.min)}–{formatNumberId(peak.max)} ton
              </div>

              <div className="mt-4 rounded-lg border border-[#e1e9dc] bg-background/90 p-3 shadow-xs">
                <span className="block text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Jendela Waktu Puncak
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-foreground">
                  Minggu {formatHarvestRange(peak.weekStart, new Date(+peak.weekStart + WEEK_MS - 86_400_000))}
                </span>
              </div>

              {overCapacity && (
                <p className="mt-2 text-xs font-medium text-accent">
                  {overCapacity.percentOfCapacity}% dari kapasitas {overCapacity.commodityName.toLowerCase()}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Belum ada proyeksi untuk musim ini.
            </p>
          )}
        </div>

        <dl className="mt-6 flex flex-col divide-y divide-[#e1e9dc] border-t border-[#e1e9dc] pt-2">
          {ledger.map(row => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd
                className={cn(
                  'text-xs font-semibold tabular-nums',
                  row.tone === 'accent' ? 'text-accent font-bold' : 'text-foreground',
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>


      <div className="flex min-w-0 flex-col p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h2 id="projection-heading" className="text-base font-bold tracking-tight text-foreground">
              Proyeksi Panen Mingguan
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Setiap minggu adalah rentang estimasi berbasis GDD & cuaca, bukan satu angka pasti.
            </p>
          </div>
          <Legend />
        </div>

        <ProjectionChart weeks={weeks} />
      </div>
    </section>
  )
}

function Legend() {
  return (
    <ul className="flex shrink-0 items-center gap-3">
      <li className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-background border border-border px-3 py-1 rounded-full shadow-xs">
        <span aria-hidden className="relative block h-3.5 w-2 rounded-full bg-[var(--terrion-green-200)]">
          <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--terrion-green-600)]" />
        </span>
        Perkiraan & Rentang
      </li>
      <li className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-background border border-border px-3 py-1 rounded-full shadow-xs">
        <span aria-hidden className="block h-3.5 w-2 rounded-full bg-accent" />
        Melewati Kapasitas
      </li>
    </ul>
  )
}




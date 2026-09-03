import type { ImpactFigures } from '@/lib/agronomy/impact'
import { formatNumberId } from '@/lib/format/number'
import { formatRupiah, formatRupiahSigned } from '@/lib/format/rupiah'
import { cn } from '@/lib/utils'

type Figure = {
  label: string
  value: number | null
  unit?: string
  format?: (value: number) => string
  hint: string
  emptyHint: string
}

export function ImpactPanel({
  figures,
  className,
}: {
  figures: ImpactFigures
  className?: string
}) {
  const measured = Object.values(figures).some(figure => figure !== null)

  const cells: Figure[] = [
    {
      label: 'Harga vs acuan',
      value: figures.priceVsReference,
      format: formatRupiahSigned,
      unit: '/kg',
      hint: 'Dibandingkan harga acuan provinsi pada minggu penjualan, ditimbang menurut tonase.',
      emptyHint: 'Terisi setelah panen pertama dicatat bersama harga jualnya.',
    },
    {
      label: 'Panen ke pembayaran',
      value: figures.daysToPayment,
      unit: 'hari',
      hint: 'Rata-rata jarak hari antara tanggal panen dan pembayaran diterima.',
      emptyHint: 'Terisi setelah pembayaran pertama dicatat tanggal terimanya.',
    },
    {
      label: 'Hemat pembelian input',
      value: figures.inputCostSaved,
      format: formatRupiah,
      hint: 'Selisih harga retail dan harga kolektif, hanya untuk pesanan yang sudah selesai.',
      emptyHint: 'Terisi setelah pesanan kolektif pertama selesai dengan harga retail dan kolektif tercatat.',
    },
    {
      label: 'Tonase dipindahkan',
      value: figures.tonnesDiverted,
      unit: 'ton',
      hint: 'Tonase yang keluar dari minggu padat setelah koperasi menerapkan penggeseran tanam.',
      emptyHint: 'Terisi setelah koperasi menerapkan saran penggeseran tanam.',
    },
  ]

  if (!measured) return null

  return (
    <section className={cn('flex flex-col gap-3', className)} aria-labelledby="impact-heading">
      <div>
        <h2 id="impact-heading" className="text-sm font-semibold text-foreground">
          Dampak terukur
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Dihitung dari transaksi yang tercatat, bukan dari target.
        </p>
      </div>

      <dl className="panel grid grid-cols-2 overflow-hidden sm:grid-cols-4">
        {cells.map(cell => (
          <div
            key={cell.label}
            className={cn(
              'p-5',
              'even:border-l even:border-border',
              '[&:nth-child(n+3)]:border-t [&:nth-child(n+3)]:border-border',
              'sm:[&:nth-child(n+2)]:border-l sm:[&:nth-child(n+3)]:border-t-0',
            )}
          >
            <dt className="text-xs text-muted-foreground">{cell.label}</dt>

            {cell.value === null ? (
              <dd className="mt-2 text-[0.8125rem] text-[var(--terrion-ink-faint)]">
                Belum ada data musim ini
              </dd>
            ) : (
              <dd className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl leading-none font-bold tracking-tight tabular-nums text-[var(--terrion-green-700)]">
                  {cell.format ? cell.format(cell.value) : formatNumberId(cell.value)}
                </span>
                {cell.unit && <span className="text-xs font-semibold text-[var(--terrion-green-700)]">{cell.unit}</span>}
              </dd>
            )}

            <p className="mt-2 text-[0.6875rem] leading-snug text-[var(--terrion-ink-faint)]">
              {cell.value === null ? cell.emptyHint : cell.hint}
            </p>
          </div>
        ))}
      </dl>
    </section>
  )
}





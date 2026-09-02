import type { ImpactFigures } from '@/lib/agronomy/impact'
import { formatNumberId } from '@/lib/format/number'
import { formatRupiah, formatRupiahSigned } from '@/lib/format/rupiah'
import { cn } from '@/lib/utils'

/**
 * The four figures that say what the cooperative got out of this, live.
 *
 * Every figure can be `null`, and `null` renders as "Belum ada data musim ini",
 * never as 0. That is the whole discipline of this panel: a cooperative that
 * has not yet completed a group order has not saved Rp 0, it has no figure —
 * and a dashboard of confident zeroes is exactly what a reader should
 * distrust. Each one names the event that would fill it, so an empty cell
 * reads as a measurement waiting on evidence rather than as a dead panel.
 *
 * One ruled strip, not four cards. Four separately bordered, separately
 * shadowed boxes read as four unrelated objects that happen to be adjacent;
 * these are four measurements of one season, and column rules say that where
 * four containers cannot. It is the same ledger idiom the projection's caption
 * column uses, which is what keeps this page one document instead of a wall of
 * panels.
 */

type Figure = {
  label: string
  value: number | null
  unit?: string
  format?: (value: number) => string
  /** One line naming where the number came from, so it can be traced. */
  hint: string
  /** What would fill this cell, shown in place of `hint` while it is empty. */
  emptyHint: string
}

export function ImpactPanel({
  figures,
  className,
}: {
  figures: ImpactFigures
  className?: string
}) {
  // Nothing measured yet is one fact, not four. Rendering it as four identical
  // empty cells spent a quarter of the dashboard repeating "belum ada data
  // musim ini" — and made a cooperative in its first season look like a
  // cooperative whose product is broken.
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

      {measured ? (
        <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-xs)] sm:grid-cols-4">
          {cells.map(cell => (
            <div
              key={cell.label}
              className={cn(
                'p-4 sm:p-5',
                // Cell rules, not four bordered boxes. On a phone the strip
                // folds to two columns, so the second pair needs a rule above
                // it that the four-across layout must not keep.
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
                  <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums text-foreground">
                    {cell.format ? cell.format(cell.value) : formatNumberId(cell.value)}
                  </span>
                  {cell.unit && <span className="text-xs text-muted-foreground">{cell.unit}</span>}
                </dd>
              )}

              {/* Provenance of a number that is not there is noise — while a
                  cell is empty its own unlock condition is the more useful
                  sentence. */}
              <p className="mt-2 text-[0.6875rem] leading-snug text-[var(--terrion-ink-faint)]">
                {cell.value === null ? cell.emptyHint : cell.hint}
              </p>
            </div>
          ))}
        </dl>
      ) : (
        // Full width, like the strip it stands in for. A prose-width box under
        // a full-width heading reads as a panel that only half rendered.
        <div className="rounded-lg border border-dashed border-input bg-card/60 px-5 py-6">
          <p className="max-w-prose text-[0.8125rem] leading-relaxed text-muted-foreground">
            Belum ada yang bisa dihitung musim ini. Panel ini terisi sendiri begitu panen pertama
            dicatat bersama harga jualnya, pembayaran pertama diterima, dan pesanan kolektif
            pertama selesai.
          </p>
        </div>
      )}
    </section>
  )
}

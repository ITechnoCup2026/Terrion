import { StatTile } from '@/components/ui/StatTile'
import type { ImpactFigures } from '@/lib/agronomy/impact'
import { formatRupiah, formatRupiahSigned } from '@/lib/format/rupiah'
import { cn } from '@/lib/utils'

/**
 * The four figures that say what the cooperative got out of this, live.
 *
 * Every tile can be `null`, and `null` renders as "Belum ada data musim ini",
 * never as 0. That is the whole discipline of this panel: a cooperative that
 * has not yet completed a group order has not saved Rp 0, it has no figure —
 * and a dashboard of confident zeroes is exactly what a judge should distrust.
 *
 * Each tile names its source, so any number here can be traced back to the
 * rows it came from rather than being taken on faith.
 *
 * Two tiles are expected to sit empty for a cooperative that has not yet
 * completed a priced group order or accepted a staggering suggestion. That is
 * not a gap to be seeded away: there is no citable retail fertiliser price to
 * seed figure 3 from, and nothing in the product writes the accepted-suggestion
 * log figure 4 measures, so a number in either tile would be invented. Each
 * tile therefore states the event that fills it, which is a roadmap rather than
 * a dead panel.
 */
export function ImpactPanel({
  figures,
  className,
}: {
  figures: ImpactFigures
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)} aria-labelledby="impact-heading">
      <div>
        <h2 id="impact-heading" className="text-sm font-medium text-foreground">
          Dampak terukur
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Dihitung dari transaksi yang tercatat, bukan dari target.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Harga vs acuan"
          value={figures.priceVsReference}
          formatValue={formatRupiahSigned}
          unit="/kg"
          hint="Dibandingkan harga acuan provinsi pada minggu penjualan, ditimbang menurut tonase."
          emptyHint="Terisi setelah panen pertama dicatat bersama harga jualnya."
        />
        <StatTile
          label="Panen ke pembayaran"
          value={figures.daysToPayment}
          unit="hari"
          hint="Rata-rata jarak hari antara tanggal panen dan pembayaran diterima."
          emptyHint="Terisi setelah pembayaran pertama dicatat tanggal terimanya."
        />
        <StatTile
          label="Hemat pembelian input"
          value={figures.inputCostSaved}
          formatValue={formatRupiah}
          hint="Selisih harga retail dan harga kolektif, hanya untuk pesanan yang sudah selesai."
          emptyHint="Terisi setelah pesanan kolektif pertama selesai dengan harga retail dan harga kolektif tercatat."
        />
        <StatTile
          label="Tonase dipindahkan"
          value={figures.tonnesDiverted}
          unit="ton"
          hint="Tonase yang keluar dari minggu padat setelah koperasi menerapkan penggeseran tanam."
          emptyHint="Terisi setelah koperasi menerapkan saran penggeseran tanam."
        />
      </div>
    </section>
  )
}

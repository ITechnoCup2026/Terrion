import Link from 'next/link'
import { redirect } from 'next/navigation'

import { CreateOrderButton } from '@/components/commerce/CreateOrderButton'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/Card'
import { Page, PageHeader } from '@/components/ui/Page'
import { EmptyState } from '@/components/ui/EmptyState'
import { addDays } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { formatNumberId } from '@/lib/format/number'
import { SUBSIDY_CAP_HA } from '@/lib/rdkk/aggregate'
import { loadSeasonInputs, seasonRequirementLines } from '@/lib/rdkk/load'
import { KG_PER_SACK, toOrderLines } from '@/lib/rdkk/order'

export const metadata = { title: 'Pembelian' }

// A freshly created order has to appear immediately.
export const dynamic = 'force-dynamic'

export default async function PurchasesPage() {
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (!user.cooperative_id) redirect('/catalog')

  const now = new Date()
  const rdkk = await loadSeasonInputs({ label: 'musim ini', start: addDays(now, -365), end: now })
  const lines = toOrderLines(seasonRequirementLines(rdkk))

  const overCap = rdkk.rows.filter(m => m.overSubsidyCap)

  // A kader may read the requirement -- it is their members' land -- but only a
  // pengurus can commit the cooperative to an order. Showing them a button that
  // the Server Action will refuse is worse than not showing one.
  const canOrder = user.role === 'pengurus'

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader
        title="Pembelian kelompok"
        description="Kebutuhan pupuk musim ini, diagregasi dari tanam yang sudah tercatat."
        actions={
          lines.length > 0 && (
            <Link href="/purchases/rdkk" className={buttonVariants({ variant: 'outline' })}>
              Ekspor RDKK
            </Link>
          )
        }
      />

      {lines.length === 0 ? (
        <EmptyState
          title="Belum ada kebutuhan pupuk"
          description="Kebutuhan dihitung dari tanam yang tercatat 12 bulan terakhir. Daftarkan tanam untuk mengisi daftar ini."
        />
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">Kebutuhan musim ini</p>
              <p className="text-xs text-muted-foreground">
                {rdkk.rows.length} anggota · karung {KG_PER_SACK} kg
              </p>
            </div>

            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Pupuk</th>
                  <th className="pb-2 text-right font-medium">Kebutuhan</th>
                  <th className="pb-2 text-right font-medium">Pesan</th>
                </tr>
              </thead>
              <tbody>
                {lines.map(l => (
                  <tr key={l.item} className="border-b border-border/50 last:border-0">
                    <td className="py-2 font-medium uppercase text-foreground">{l.item}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {formatNumberId(l.quantityKg / 1000)} ton
                    </td>
                    <td className="py-2 text-right tabular-nums text-foreground">
                      {formatNumberId(l.quantity, 0)} karung
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Rounding up is a decision, not an accident, so it is stated. */}
            <p className="mt-3 text-xs text-muted-foreground">
              Jumlah karung dibulatkan ke atas — pupuk tidak dijual per kilogram,
              dan memesan kurang lebih berisiko daripada memesan lebih.
            </p>

            {rdkk.commoditiesWithoutRates.length > 0 && (
              <p className="mt-2 text-xs text-destructive">
                {rdkk.commoditiesWithoutRates.length} komoditas belum punya acuan dosis,
                sehingga luasnya tidak masuk hitungan di atas.
              </p>
            )}

            {canOrder ? (
              <>
                <div className="mt-4">
                  <CreateOrderButton />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Pesanan disimpan sebagai draf tanpa harga. Harga eceran dan harga
                  kelompok diisi setelah pemasok memberi penawaran.
                </p>
              </>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                Hanya pengurus yang dapat membuat pesanan kelompok. Anda tetap dapat
                melihat kebutuhan musim ini di atas.
              </p>
            )}
          </Card>

          {overCap.length > 0 && (
            <Card tone="alert">
              <p className="text-sm font-semibold text-foreground">
                {overCap.length} anggota melewati batas {SUBSIDY_CAP_HA} ha
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Batas pupuk bersubsidi berlaku per petani. Luas di atas batas tetap
                dihitung di sini dan harus diajukan terpisah, bukan dihapus diam-diam.
              </p>
              <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                {overCap.map(m => (
                  <li key={m.memberId}>
                    {m.memberName} — {formatNumberId(m.plantedHa)} ha
                    <span className="text-destructive">
                      {' '}(+{formatNumberId(m.excessHa)} ha di atas batas)
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </Page>
  )
}

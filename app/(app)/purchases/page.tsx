import Link from 'next/link'
import { redirect } from 'next/navigation'

import { CreateOrderButton } from '@/components/commerce/CreateOrderButton'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { addDays } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { formatNumberId } from '@/lib/format/number'
import { SUBSIDY_CAP_HA } from '@/lib/rdkk/aggregate'
import { loadSeasonInputs } from '@/lib/rdkk/load'
import { KG_PER_SACK, toOrderLines } from '@/lib/rdkk/order'
import { createServerClient } from '@/lib/supabase/server'

export const metadata = { title: 'Pembelian' }

// A freshly created order has to appear immediately.
export const dynamic = 'force-dynamic'

export default async function PurchasesPage() {
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (!user.cooperative_id) redirect('/catalog')

  const now = new Date()
  const rdkk = await loadSeasonInputs(user.cooperative_id, {
    label: 'musim ini', start: addDays(now, -365), end: now,
  })
  const lines = toOrderLines(rdkk.totals)

  const db = await createServerClient()
  const { data: orders } = await db.from('input_order')
    .select('id, season_label, status, created_at, input_order_line(item, quantity, unit)')
    .order('created_at', { ascending: false })

  const overCap = rdkk.members.filter(m => m.overSubsidyCap)

  // A kader may read the requirement -- it is their members' land -- but only a
  // pengurus can commit the cooperative to an order. Showing them a button that
  // the Server Action will refuse is worse than not showing one.
  const canOrder = user.role === 'pengurus'

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Pembelian kelompok</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kebutuhan pupuk musim ini, diagregasi dari tanam yang sudah tercatat.
          </p>
        </div>
        {lines.length > 0 && (
          <Link href="/purchases/rdkk" className={buttonVariants({ variant: 'outline' })}>
            Ekspor RDKK
          </Link>
        )}
      </div>

      {lines.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Belum ada kebutuhan pupuk"
          description="Kebutuhan dihitung dari tanam yang tercatat 12 bulan terakhir. Daftarkan tanam untuk mengisi daftar ini."
        />
      ) : (
        <>
          <div className="mt-6 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">Kebutuhan musim ini</p>
              <p className="text-xs text-muted-foreground">
                {rdkk.members.length} anggota · karung {KG_PER_SACK} kg
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
          </div>

          {overCap.length > 0 && (
            <div className="mt-4 rounded-lg border border-destructive/40 bg-card p-4">
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
            </div>
          )}
        </>
      )}

      <h2 className="mt-8 text-sm font-semibold text-foreground">Pesanan tersimpan</h2>
      {(orders ?? []).length === 0 ? (
        <EmptyState
          className="mt-3"
          title="Belum ada pesanan"
          description="Pesanan yang Anda buat akan muncul di sini beserta rinciannya."
        />
      ) : (
        <div className="mt-3 grid gap-3">
          {(orders ?? []).map(o => (
            <div key={o.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{o.season_label}</p>
                <p className="text-xs text-muted-foreground">
                  {o.status === 'draft' ? 'Draf' : o.status === 'submitted' ? 'Terkirim' : 'Selesai'}
                  {' · '}
                  {new Date(o.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {o.input_order_line.map(l =>
                  `${l.item} ${formatNumberId(l.quantity, 0)} ${l.unit}`).join(' · ')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'

import { CreateOrderButton } from '@/components/commerce/CreateOrderButton'
import { Badge } from '@/components/ui/Badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Table, TableFrame, TBody, Td, Th, THead } from '@/components/ui/DataTable'
import { Page, PageHeader } from '@/components/ui/Page'
import { EmptyState } from '@/components/ui/EmptyState'
import { addDays } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { formatDateId } from '@/lib/harvest/format'
import { formatNumberId } from '@/lib/format/number'
import { SUBSIDY_CAP_HA } from '@/lib/rdkk/aggregate'
import { loadInputOrders, loadSeasonInputs, seasonRequirementLines } from '@/lib/rdkk/load'
import { KG_PER_SACK, toOrderLines } from '@/lib/rdkk/order'
import type { InputOrderStatusRaw } from '@/lib/api/types'

const ORDER_STATUS_LABEL: Record<InputOrderStatusRaw, string> = {
  draft: 'Draf', submitted: 'Diajukan ke pemasok', completed: 'Selesai',
}
const ORDER_STATUS_TONE: Record<InputOrderStatusRaw, 'neutral' | 'positive' | 'warning'> = {
  draft: 'neutral', submitted: 'warning', completed: 'positive',
}

export const metadata = { title: 'Pembelian' }

// A freshly created order has to appear immediately.
export const dynamic = 'force-dynamic'

export default async function PurchasesPage() {
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (!user.cooperative_id) redirect('/catalog')

  const now = new Date()
  const [rdkk, orders] = await Promise.all([
    loadSeasonInputs({ label: 'musim ini', start: addDays(now, -365), end: now }),
    loadInputOrders(),
  ])
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
          <Card pad="none">
            <CardHeader
              className="p-4"
              title="Kebutuhan musim ini"
              description="Diagregasi dari setiap tanam yang tercatat 12 bulan terakhir."
              actions={
                <span className="text-xs text-muted-foreground">
                  {rdkk.rows.length} anggota · karung {KG_PER_SACK} kg
                </span>
              }
            />

            {/* The frame runs edge to edge inside the card, so the header rule
                spans the panel rather than floating inside a padded box. */}
            <TableFrame className="rounded-none border-x-0 border-b-0">
              <Table>
                <THead>
                  <tr>
                    <Th>Pupuk</Th>
                    <Th numeric>Kebutuhan</Th>
                    <Th numeric>Pesan</Th>
                  </tr>
                </THead>
                <TBody>
                  {lines.map(l => (
                    <tr key={l.item}>
                      <Td className="text-foreground capitalize">{l.item}</Td>
                      <Td numeric className="text-muted-foreground">
                        {formatNumberId(l.quantityKg / 1000)} ton
                      </Td>
                      <Td numeric className="text-foreground">
                        {formatNumberId(l.quantity, 0)} karung
                      </Td>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </TableFrame>

            <div className="p-4 pt-3">

            {/* Rounding up is a decision, not an accident, so it is stated. */}
            <p className="text-xs text-muted-foreground">
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

      {orders.length > 0 && (
        <Card pad="none">
          <CardHeader
            className="p-4"
            title="Riwayat pesanan kelompok"
            description="Ke mana pesanan yang sudah dibuat pergi — setiap klik “Buat pesanan kelompok” di atas menambah satu baris di sini."
            actions={
              <span className="text-xs text-muted-foreground">{orders.length} pesanan</span>
            }
          />

          <TableFrame className="rounded-none border-x-0 border-b-0" maxHeight="24rem">
            <Table>
              <THead>
                <tr>
                  <Th>Tanggal</Th>
                  <Th>Musim</Th>
                  <Th>Isi</Th>
                  <Th>Status</Th>
                </tr>
              </THead>
              <TBody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {formatDateId(order.createdAt)}
                    </Td>
                    <Td className="text-foreground">{order.seasonLabel}</Td>
                    <Td className="text-muted-foreground">
                      {order.lines.map(l => `${formatNumberId(l.quantity, 0)} ${l.unit} ${l.item}`).join(', ')}
                    </Td>
                    <Td>
                      <Badge tone={ORDER_STATUS_TONE[order.status]}>
                        {ORDER_STATUS_LABEL[order.status]}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          </TableFrame>

          {orders.every(o => o.status === 'draft') && (
            <p className="border-t border-border p-4 text-xs text-muted-foreground">
              Semua pesanan di sini masih draf: belum ada transisi ke pemasok di sistem ini
              hari ini, jadi status bergerak lewat kesepakatan di luar platform sampai fitur
              itu ada.
            </p>
          )}
        </Card>
      )}
    </Page>
  )
}

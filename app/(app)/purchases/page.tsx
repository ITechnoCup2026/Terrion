import { redirect } from 'next/navigation'

import { PurchasesView } from '@/components/purchases/PurchasesView'
import { Page, PageHeader } from '@/components/ui/Page'
import { addDays } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { loadInputOrders, loadSeasonInputs, seasonRequirementLines } from '@/lib/rdkk/load'
import { toOrderLines } from '@/lib/rdkk/order'

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
  // pengurus can commit the cooperative to an order.
  const canOrder = user.role === 'pengurus'

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader
        title="Pembelian kelompok"
        description="Kebutuhan pupuk musim ini, diagregasi dari tanam yang sudah tercatat."
      />

      <PurchasesView
        rdkk={rdkk}
        lines={lines}
        overCap={overCap}
        orders={orders}
        canOrder={canOrder}
      />
    </Page>
  )
}


import { CheckCircle2, Clock, Inbox, XCircle } from 'lucide-react'
import { redirect } from 'next/navigation'

import { RequestsTable } from '@/components/requests/RequestsTable'
import { MetricRow, type Metric } from '@/components/ui/Card'
import { Page, PageHeader } from '@/components/ui/Page'
import { currentAppUser } from '@/lib/auth/session'
import { loadCommodities } from '@/lib/commodities/load'
import { formatNumberId } from '@/lib/format/number'
import { loadSupplyRequests } from '@/lib/supply-requests/load'

export const metadata = { title: 'Permintaan pasokan' }

export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (user.role !== 'pengurus') redirect('/dashboard')

  const [rows, commodities] = await Promise.all([
    loadSupplyRequests(),
    loadCommodities(),
  ])
  const commodityName = new Map(commodities.map(c => [c.id, c.name]))

  const pendingCount = rows.filter(r => r.status === 'pending').length
  const acceptedCount = rows.filter(r => r.status === 'accepted').length
  const declinedCount = rows.filter(r => r.status === 'declined').length

  const kpis: Metric[] = [
    { label: 'Total Permintaan', value: formatNumberId(rows.length), icon: Inbox },
    {
      label: 'Menunggu Persetujuan',
      value: formatNumberId(pendingCount),
      icon: Clock,
      tone: pendingCount > 0 ? 'accent' : 'default',
      hint: 'Perlu keputusan pengurus',
    },
    { label: 'Diterima', value: formatNumberId(acceptedCount), icon: CheckCircle2, tone: 'success' },
    { label: 'Ditolak / Ditarik', value: formatNumberId(declinedCount), icon: XCircle },
  ]

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader
        title="Permintaan Pasokan"
        description="Pengajuan pasokan hasil panen dari pembeli untuk diproses dan disetujui koperasi."
      />

      <MetricRow items={kpis} />

      <RequestsTable rows={rows} commodityName={commodityName} />
    </Page>
  )
}

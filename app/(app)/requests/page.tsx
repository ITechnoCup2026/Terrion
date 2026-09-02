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

  // Only the pending figure is gold. "Diterima" is a settled count, not a
  // decision waiting on anybody, and a row where three of four figures are
  // emphasised emphasises nothing.
  const kpis: Metric[] = [
    { label: 'Total permintaan', value: formatNumberId(rows.length) },
    {
      label: 'Menunggu persetujuan',
      value: formatNumberId(pendingCount),
      tone: pendingCount > 0 ? 'accent' : 'default',
      hint: 'Perlu keputusan pengurus',
    },
    { label: 'Diterima', value: formatNumberId(acceptedCount) },
    { label: 'Ditolak atau ditarik', value: formatNumberId(declinedCount) },
  ]

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader
        title="Permintaan pasokan"
        description="Pengajuan pasokan hasil panen dari pembeli untuk diproses dan disetujui koperasi."
      />

      <MetricRow items={kpis} />

      <RequestsTable rows={rows} commodityName={commodityName} />
    </Page>
  )
}

import { redirect } from 'next/navigation'

import { RequestsTable } from '@/components/requests/RequestsTable'
import { Page, PageHeader } from '@/components/ui/Page'
import { currentAppUser } from '@/lib/auth/session'
import { loadCommodities } from '@/lib/commodities/load'
import { loadSupplyRequests } from '@/lib/supply-requests/load'

export const metadata = { title: 'Permintaan pasokan' }

// Answering a request must be visible immediately; nothing here may be cached.
export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (user.role !== 'pengurus') redirect('/dashboard')

  // GET /api/supply-requests scopes this to the viewer's own cooperative --
  // another cooperative's requests are never returned, so there is nothing to
  // filter here beyond what the backend already did.
  const [rows, commodities] = await Promise.all([
    loadSupplyRequests(),
    loadCommodities(),
  ])
  const commodityName = new Map(commodities.map(c => [c.id, c.name]))

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader
        title="Permintaan pasokan"
        description="Pembeli mengajukan; koperasi memutuskan menerima atau menolak."
      />

      <RequestsTable rows={rows} commodityName={commodityName} />
    </Page>
  )
}

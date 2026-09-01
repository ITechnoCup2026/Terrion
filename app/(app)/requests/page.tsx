import { redirect } from 'next/navigation'

import { respondToRequest } from '@/app/actions/supply-request'
import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/Card'
import { Page, PageHeader } from '@/components/ui/Page'
import { EmptyState } from '@/components/ui/EmptyState'
import { utcDate } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { INBOX_EMPTY, requestBuyerLabel, requestStatusLabel } from '@/lib/catalog/copy'
import { loadCommodities } from '@/lib/commodities/load'
import { formatNumberId } from '@/lib/format/number'
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

      {rows.length === 0 ? (
        <EmptyState {...INBOX_EMPTY} />
      ) : (
        <ul className="grid list-none gap-3">
          {rows.map(r => (
            <Card as="li" key={r.id}>
              <p className="text-sm font-semibold text-foreground">
                {commodityName.get(r.commodityId) ?? 'Komoditas'} — {formatNumberId(r.volumeKg / 1000)} ton
              </p>

              <p className="mt-0.5 text-sm text-muted-foreground">
                {requestBuyerLabel(r.buyerName, r.buyerOrganisation)}
              </p>

              <div className="mt-1.5">
                <HarvestWindow
                  size="sm"
                  week={{
                    start: utcDate(r.windowStart),
                    end: utcDate(r.windowEnd),
                    basis: 'observed',
                  }}
                />
              </div>

              {r.notes && (
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {r.notes}
                </p>
              )}

              {r.status === 'pending' ? (
                <div className="mt-3 flex gap-2">
                  <form action={async () => {
                    'use server'
                    const result = await respondToRequest({ requestId: r.id, decision: 'accepted' })
                    // These two buttons are inline Server Actions inside a Server
                    // Component, so there is nowhere here to render a message.
                    // A failure therefore goes to requests/error.tsx exactly as it
                    // did before -- which is worse copy than the other call sites
                    // now get, but far better than a click that silently does
                    // nothing and leaves the request looking answered.
                    if (!result.ok) throw new Error(result.message)
                  }}>
                    <Button type="submit">Terima</Button>
                  </form>
                  <form action={async () => {
                    'use server'
                    const result = await respondToRequest({ requestId: r.id, decision: 'declined' })
                    if (!result.ok) throw new Error(result.message)
                  }}>
                    <Button type="submit" variant="outline">Tolak</Button>
                  </form>
                </div>
              ) : (
                <p className="mt-3 text-sm font-medium text-foreground">
                  {requestStatusLabel(r.status)}
                </p>
              )}
            </Card>
          ))}
        </ul>
      )}
    </Page>
  )
}

// This repo has no backend attached. currentAppUser() below always returns
// null, so every path past its redirect is dead code left untyped rather
// than rewritten; re-check it once a real backend returns.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { redirect } from 'next/navigation'

import { respondToRequest } from '@/app/actions/supply-request'
import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { utcDate } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { INBOX_EMPTY, requestBuyerLabel, requestStatusLabel } from '@/lib/catalog/copy'
import { formatNumberId } from '@/lib/format/number'
import { createServerClient } from '@/lib/supabase/server'

export const metadata = { title: 'Permintaan pasokan' }

// Answering a request must be visible immediately; nothing here may be cached.
export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (user.role !== 'pengurus') redirect('/dashboard')

  const db = await createServerClient()

  // RLS scopes this to the viewer's own cooperative. Another cooperative's
  // requests are not filtered out here -- they are never returned.
  //
  // Who is asking is read from the request row, not from app_user. app_user
  // carries a single policy, self_read (id = auth.uid()), so a pengurus cannot
  // read the buyer's row and a join would always come back null. The name and
  // organisation are copied onto the request at insert time instead, which
  // keeps that boundary intact: browsing the catalogue stays anonymous, and
  // identity is disclosed by the act of asking, to the cooperative asked.
  const { data: requests } = await db.from('supply_contract_request')
    .select('id, volume_kg, window_start, window_end, status, notes, created_at, buyer_name, buyer_organisation, commodity:commodity_id(name)')
    .order('created_at', { ascending: false })

  const rows = requests ?? []

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground">Permintaan pasokan</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pembeli mengajukan; koperasi memutuskan menerima atau menolak.
      </p>

      {rows.length === 0 ? (
        <EmptyState className="mt-6" {...INBOX_EMPTY} />
      ) : (
        <div className="mt-6 grid gap-3">
          {rows.map(r => {
            const commodity = r.commodity as unknown as { name: string } | null

            return (
              <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">
                  {commodity?.name ?? 'Komoditas'} — {formatNumberId(r.volume_kg / 1000)} ton
                </p>

                <p className="mt-0.5 text-sm text-muted-foreground">
                  {requestBuyerLabel(r.buyer_name, r.buyer_organisation)}
                </p>

                <div className="mt-1">
                  <HarvestWindow
                    size="sm"
                    week={{
                      start: utcDate(r.window_start),
                      end: utcDate(r.window_end),
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
                      // These two buttons are inline Server Actions inside a Server
                      // Component, so there is nowhere here to render a message.
                      // A failure therefore goes to requests/error.tsx exactly as it
                      // did before -- which is worse copy than the other call sites
                      // now get, but far better than a click that silently does
                      // nothing and leaves the request looking answered.
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

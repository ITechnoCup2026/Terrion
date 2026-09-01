import Link from 'next/link'
import { redirect } from 'next/navigation'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Page, PageHeader } from '@/components/ui/Page'
import { utcDate } from '@/lib/agronomy/dates'
import { loadAtlasCooperativesIfUp } from '@/lib/atlas/load'
import { currentAppUser } from '@/lib/auth/session'
import { requestStatusLabel } from '@/lib/catalog/copy'
import { loadCommodities } from '@/lib/commodities/load'
import { formatDateId } from '@/lib/harvest/format'
import { formatNumberId } from '@/lib/format/number'
import { loadSupplyRequests } from '@/lib/supply-requests/load'

export const metadata = { title: 'Permintaan saya' }

// The whole point of the page is the status, and a cooperative can change it
// at any moment. A cached answer here would tell a buyer they are still
// waiting on a request that was accepted this morning.
export const dynamic = 'force-dynamic'

export default async function MyRequestsPage() {
  const user = await currentAppUser()
  if (!user) redirect('/login')
  // Cooperative staff have their own inbox, which is the same rows read from
  // the other side; sending them there beats showing them an empty list.
  if (user.role !== 'buyer') redirect('/requests')

  // GET /api/supply-requests is scoped by session, and for a buyer that means
  // their own requests -- there is nothing to filter here.
  //
  // The cooperative's name is not on the request row and there is no endpoint
  // that puts it there, so it comes from the public atlas list, which already
  // carries every cooperative's name. Tolerant of that call failing: an
  // unnamed counterparty is a worse page, an exception is no page at all.
  const [rows, commodities, cooperatives] = await Promise.all([
    loadSupplyRequests(),
    loadCommodities(),
    loadAtlasCooperativesIfUp(),
  ])
  const commodityName = new Map(commodities.map(c => [c.id, c.name]))
  const cooperativeName = new Map((cooperatives ?? []).map(c => [c.id, c.name]))

  // Newest first: a buyer opens this to check the request they just sent.
  const sorted = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader
        title="Permintaan saya"
        description="Permintaan pasokan yang Anda ajukan, dan jawaban koperasi atas masing-masing."
        actions={
          <Link href="/catalog" className={buttonVariants({ variant: 'outline' })}>
            Jelajahi katalog
          </Link>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          title="Anda belum mengajukan permintaan"
          description="Pilih panen yang diproyeksikan di katalog, lalu ajukan volume dan minggu yang Anda butuhkan."
          action={
            <Link href="/catalog" className={buttonVariants()}>
              Buka katalog
            </Link>
          }
        />
      ) : (
        <ul className="grid list-none gap-3">
          {sorted.map(r => (
            <Card as="li" key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {commodityName.get(r.commodityId) ?? 'Komoditas'} — {formatNumberId(r.volumeKg / 1000)} ton
                </p>
                <p className="text-sm font-medium text-foreground">
                  {requestStatusLabel(r.status)}
                </p>
              </div>

              <p className="mt-0.5 text-sm text-muted-foreground">
                Kepada {cooperativeName.get(r.cooperativeId) ?? 'koperasi'}
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

              {/* Sliced to ten characters: these two are timestamps, not the
                  date-only strings the harvest window carries, and utcDate
                  parses by splitting on '-'. */}
              <p className="mt-2 text-xs text-muted-foreground">
                Diajukan {formatDateId(utcDate(r.createdAt.slice(0, 10)))}
                {r.respondedAt && ` · dijawab ${formatDateId(utcDate(r.respondedAt.slice(0, 10)))}`}
              </p>
            </Card>
          ))}
        </ul>
      )}

      {/* Said here as well as on the confirmation: this list looks like an
          order book, and it is not one. */}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Terrion adalah penyedia sistem, bukan pihak dalam kontrak. Kesepakatan dan
        pengiriman diatur langsung antara Anda dan koperasi.
      </p>
    </Page>
  )
}

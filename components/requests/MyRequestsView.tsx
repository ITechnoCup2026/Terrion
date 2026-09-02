'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Building2, Calendar, Search, Store } from 'lucide-react'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { Badge } from '@/components/ui/Badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, MetricRow, type Metric } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/DataTable'
import { utcDate } from '@/lib/agronomy/dates'
import { commodityStyle } from '@/lib/catalog/commodity-style'
import { formatDateId } from '@/lib/harvest/format'
import { formatNumberId } from '@/lib/format/number'
import type { SupplyRequest } from '@/lib/supply-requests/load'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | SupplyRequest['status']

const STATUS_FILTERS: StatusFilter[] = ['all', 'accepted', 'pending', 'declined', 'withdrawn']

const STATUS_TAB_LABEL: Record<StatusFilter, string> = {
  all: 'Semua',
  accepted: 'Disetujui (ACC)',
  pending: 'Menunggu',
  declined: 'Ditolak',
  withdrawn: 'Ditarik',
}

interface CommodityItem {
  id: string
  name: string
}

interface CooperativeItem {
  id: string
  name: string
  province?: string
  district?: string
}

export function MyRequestsView({
  requests,
  commodities,
  cooperatives,
}: {
  requests: SupplyRequest[]
  commodities: CommodityItem[]
  cooperatives: CooperativeItem[]
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const commodityMap = useMemo(
    () => new Map(commodities.map(c => [c.id, c.name])),
    [commodities],
  )

  const cooperativeMap = useMemo(
    () => new Map(cooperatives.map(c => [c.id, c])),
    [cooperatives],
  )

  // Sort newest first
  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests],
  )

  // Calculate summary statistics
  const stats = useMemo(() => {
    const total = requests.length
    const accepted = requests.filter(r => r.status === 'accepted').length
    const pending = requests.filter(r => r.status === 'pending').length
    const declined = requests.filter(r => r.status === 'declined').length
    const acceptedTonnes = requests
      .filter(r => r.status === 'accepted')
      .reduce((sum, r) => sum + r.volumeKg / 1000, 0)

    return { total, accepted, pending, declined, acceptedTonnes }
  }, [requests])

  // Filter requests by status tab and search query
  const filteredRequests = useMemo(() => {
    return sortedRequests.filter(r => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter

      if (!matchStatus) return false

      if (!searchQuery.trim()) return true

      const query = searchQuery.toLowerCase()
      const commName = (commodityMap.get(r.commodityId) ?? '').toLowerCase()
      const coop = cooperativeMap.get(r.cooperativeId)
      const coopName = (coop?.name ?? '').toLowerCase()
      const notes = (r.notes ?? '').toLowerCase()

      return commName.includes(query) || coopName.includes(query) || notes.includes(query)
    })
  }, [sortedRequests, statusFilter, searchQuery, commodityMap, cooperativeMap])

  const summary: Metric[] = [
    { label: 'Total permintaan', value: stats.total },
    {
      label: 'Disetujui',
      value: stats.accepted,
      hint: stats.acceptedTonnes > 0
        ? `${formatNumberId(stats.acceptedTonnes)} ton disetujui koperasi`
        : undefined,
    },
    {
      label: 'Menunggu jawaban',
      value: stats.pending,
      tone: stats.pending > 0 ? 'accent' : 'default',
    },
    { label: 'Ditolak', value: stats.declined },
  ]

  if (requests.length === 0) {
    return (
      <EmptyState
        title="Belum ada pengajuan permintaan pasokan"
        description="Jelajahi komoditas panen yang diproyeksikan koperasi di katalog, lalu ajukan volume dan minggu yang Anda butuhkan."
        action={
          <Link href="/catalog" className={buttonVariants({ size: 'lg' })}>
            <Store className="mr-2 size-4" />
            Jelajahi katalog pasokan
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* The same figure row the cooperative side uses, rather than four
          tinted cards with glyph chips. Only "menunggu" is gold: it is the
          one count that is waiting on somebody to act. */}
      <MetricRow items={summary} />

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <SegmentedControl
          ariaLabel="Saring permintaan menurut status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_FILTERS.map(filter => ({
            value: filter,
            label: STATUS_TAB_LABEL[filter],
            count:
              filter === 'all'
                ? requests.length
                : requests.filter(r => r.status === filter).length,
          }))}
        />

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari komoditas atau koperasi..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="interactive h-9 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
        </div>
      </div>

      {/* Request Cards Grid */}
      {filteredRequests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            Tidak ada permintaan dengan kriteria filter saat ini
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Coba ubah tab filter status atau bersihkan kata kunci pencarian.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all')
              setSearchQuery('')
            }}
            className="mt-4 text-xs font-medium text-primary hover:underline"
          >
            Reset semua filter
          </button>
        </div>
      ) : (
        <ul className="grid list-none gap-4">
          {filteredRequests.map(req => {
            const commName = commodityMap.get(req.commodityId) ?? 'Komoditas'
            const coop = cooperativeMap.get(req.cooperativeId)
            const coopName = coop?.name ?? 'Koperasi'
            const style = commodityStyle(commName)

            return (
              <RequestItemCard
                key={req.id}
                request={req}
                commodityName={commName}
                cooperativeName={coopName}
                province={coop?.province}
                district={coop?.district}
                style={style}
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}

function RequestItemCard({
  request,
  commodityName,
  cooperativeName,
  province,
  district,
  style,
}: {
  request: SupplyRequest
  commodityName: string
  cooperativeName: string
  province?: string
  district?: string
  style: ReturnType<typeof commodityStyle>
}) {
  return (
    <Card className="interactive overflow-hidden p-0 hover:border-input">
      {/* The crop keeps its colour as the band across the top edge, the same
          device the catalogue and the plot list use. It used to be a tinted
          slab holding a glyph on a frosted plate, which spent the widest strip
          of the card on an illustration of the word beside it. */}
      <span aria-hidden className="block h-1 w-full" style={{ background: style.hue }} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <h3 className="text-[0.9375rem] font-medium text-foreground">{commodityName}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pengajuan{' '}
            <span className="tabular-nums text-foreground">
              {formatNumberId(request.volumeKg / 1000)} ton
            </span>
          </p>
        </div>

        <StatusBadge status={request.status} />
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Target Cooperative & Location */}
          <div className="flex items-start gap-2.5">
            <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ditujukan Ke Koperasi</p>
              <p className="text-sm font-semibold text-foreground">{cooperativeName}</p>
              {(district || province) && (
                <p className="text-xs text-muted-foreground">
                  {[district, province].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Harvest Window */}
          <div className="flex items-start gap-2.5">
            <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Jendela Panen Diminta</p>
              <div className="mt-1">
                <HarvestWindow
                  size="sm"
                  week={{
                    start: utcDate(request.windowStart),
                    end: utcDate(request.windowEnd),
                    basis: 'observed',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Delivery preference */}
        {request.notes && (
          <div className="rounded-md border border-border p-3 text-xs">
            <p className="font-medium text-foreground">Catatan dan preferensi pengiriman</p>
            <p className="mt-1 whitespace-pre-line text-muted-foreground">{request.notes}</p>
          </div>
        )}

        <StatusNote status={request.status} />

        {/* Timestamps Footer */}
        <div className="flex items-center justify-between border-t border-border pt-3 text-[0.7rem] text-muted-foreground">
          <span>
            Diajukan: {formatDateId(utcDate(request.createdAt.slice(0, 10)))}
          </span>
          {request.respondedAt && (
            <span>
              Dijawab: {formatDateId(utcDate(request.respondedAt.slice(0, 10)))}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

/**
 * The buyer's view of a request's state.
 *
 * Routed through the shared <Badge> rather than four hand-rolled pills, so a
 * buyer and a pengurus looking at the same request see the same colour for the
 * same word. It used to shout in capitals with a pulsing clock on "menunggu" —
 * an animation on a state that is not changing, in a list where most rows are
 * in exactly that state.
 */
const STATUS_NOTE: Record<SupplyRequest['status'], { rule: string; title: string; body: string } | null> = {
  accepted: {
    rule: 'border-l-[var(--terrion-green-700)]',
    title: 'Koperasi menerima pengajuan ini',
    body: 'Hubungi pengurus koperasi untuk menyepakati teknis logistik dan serah terima.',
  },
  declined: {
    rule: 'border-l-destructive',
    title: 'Koperasi menolak pengajuan ini',
    body: 'Alokasi tonase untuk minggu panen yang dipilih tidak tersedia. Cari minggu atau lokasi lain di katalog.',
  },
  pending: {
    rule: 'border-l-accent',
    title: 'Menunggu jawaban koperasi',
    body: 'Pengurus koperasi belum meninjau permintaan ini. Statusnya berubah di sini begitu mereka menjawab.',
  },
  withdrawn: null,
}

/**
 * What the status means, in a sentence.
 *
 * One block keyed by status, ruled on its leading edge in the colour that
 * status already owns. It was three separate tinted panels, each with its own
 * icon and its own background, which put a filled coloured slab on every card
 * in a list where every card has a status.
 */
function StatusNote({ status }: { status: SupplyRequest['status'] }) {
  const note = STATUS_NOTE[status]
  if (!note) return null

  return (
    <div className={cn('border-l-2 pl-3.5', note.rule)}>
      <p className="text-xs font-medium text-foreground">{note.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{note.body}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: SupplyRequest['status'] }) {
  switch (status) {
    case 'accepted':
      return <Badge tone="positive">Disetujui</Badge>
    case 'declined':
      return <Badge tone="negative">Ditolak</Badge>
    case 'pending':
      return <Badge tone="warning">Menunggu jawaban</Badge>
    case 'withdrawn':
      return <Badge tone="neutral">Ditarik</Badge>
  }
}

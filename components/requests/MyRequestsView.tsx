'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Clock,
  Search,
  XCircle,
  RotateCcw,
  Store,
  Calendar,
  Building2,
  FileText,
  TrendingUp,
} from 'lucide-react'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/Card'
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

  if (requests.length === 0) {
    return (
      <EmptyState
        title="Belum ada pengajuan permintaan pasokan"
        description="Jelajahi komoditas panen yang diproyeksikan koperasi di katalog, lalu ajukan volume dan minggu yang Anda butuhkan."
        action={
          <Link href="/catalog" className={buttonVariants({ size: 'lg' })}>
            <Store className="mr-2 size-4" />
            Jelajahi Katalog Pasokan
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Metric Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-3.5 p-4 transition-all hover:border-foreground/20">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Permintaan</p>
            <p className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {stats.total}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4 border-emerald-200/60 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20 transition-all">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                Disetujui (ACC)
              </p>
              {stats.acceptedTonnes > 0 && (
                <span className="text-[0.65rem] font-semibold text-emerald-600 dark:text-emerald-400">
                  · {formatNumberId(stats.acceptedTonnes)} ton
                </span>
              )}
            </div>
            <p className="font-mono text-2xl font-bold tracking-tight text-emerald-900 dark:text-emerald-100">
              {stats.accepted}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4 border-amber-200/60 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20 transition-all">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              Menunggu Jawaban
            </p>
            <p className="font-mono text-2xl font-bold tracking-tight text-amber-900 dark:text-amber-100">
              {stats.pending}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4 border-red-200/60 bg-red-50/30 dark:border-red-900/40 dark:bg-red-950/20 transition-all">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
            <XCircle className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-red-800 dark:text-red-300">Ditolak</p>
            <p className="font-mono text-2xl font-bold tracking-tight text-red-900 dark:text-red-100">
              {stats.declined}
            </p>
          </div>
        </Card>
      </div>

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
            className="interactive h-9 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
        </div>
      </div>

      {/* Request Cards Grid */}
      {filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
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
  const isAccepted = request.status === 'accepted'
  const isDeclined = request.status === 'declined'
  const isPending = request.status === 'pending'

  return (
    <Card className="overflow-hidden p-0 transition-all hover:border-foreground/20 hover:shadow-md">
      {/* Header bar with status badge & commodity accent */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3"
        style={{ backgroundColor: style.tint }}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-background/80 shadow-xs backdrop-blur-sm">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke={style.hue}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={style.glyph} />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-foreground">
              {commodityName}
            </h3>
            <p className="text-xs text-muted-foreground">
              Pengajuan: <span className="font-mono font-medium text-foreground">{formatNumberId(request.volumeKg / 1000)} ton</span>
            </p>
          </div>
        </div>

        {/* Prominent Status Badge */}
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
          <div className="rounded-xl bg-muted/60 p-3 text-xs">
            <p className="font-semibold text-foreground">Catatan / Preferensi Pengiriman:</p>
            <p className="mt-0.5 whitespace-pre-line text-muted-foreground">{request.notes}</p>
          </div>
        )}

        {/* Actionable Status Callout Banner */}
        {isAccepted && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-semibold">Pengajuan Disetujui (ACC)!</p>
              <p className="mt-0.5 leading-relaxed">
                Koperasi telah menerima pengajuan kontrak pasokan ini. Silakan melakukan koordinasi langsung dengan pengurus koperasi mengenai teknis logistik dan serah terima.
              </p>
            </div>
          </div>
        )}

        {isDeclined && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            <XCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-semibold">Pengajuan Ditolak</p>
              <p className="mt-0.5 leading-relaxed">
                Koperasi belum dapat memenuhi alokasi tonase untuk minggu panen terpilih saat ini. Anda dapat menjelajahi penawaran pasokan minggu atau lokasi lain di katalog.
              </p>
            </div>
          </div>
        )}

        {isPending && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            <Clock className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">Menunggu Peninjauan Koperasi</p>
              <p className="mt-0.5 leading-relaxed">
                Permintaan sedang berada dalam antrean tinjauan pengurus koperasi. Status akan diperbarui secara otomatis begitu koperasi memberikan jawaban.
              </p>
            </div>
          </div>
        )}

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

function StatusBadge({ status }: { status: SupplyRequest['status'] }) {
  switch (status) {
    case 'accepted':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          DISETUJUI (ACC)
        </span>
      )
    case 'declined':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-3 py-1 text-xs font-bold text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <XCircle className="size-3.5 text-red-600 dark:text-red-400" />
          DITOLAK
        </span>
      )
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <Clock className="size-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
          MENUNGGU JAWABAN
        </span>
      )
    case 'withdrawn':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          <RotateCcw className="size-3.5" />
          DITARIK
        </span>
      )
  }
}

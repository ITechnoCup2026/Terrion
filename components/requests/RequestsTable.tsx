'use client'

import { useMemo, useState, useTransition } from 'react'

import { respondToRequest } from '@/app/actions/supply-request'
import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { utcDate } from '@/lib/agronomy/dates'
import { INBOX_EMPTY, requestBuyerLabel } from '@/lib/catalog/copy'
import { formatDateId } from '@/lib/harvest/format'
import { formatNumberId } from '@/lib/format/number'
import type { SupplyRequest } from '@/lib/supply-requests/load'

type StatusFilter = 'all' | SupplyRequest['status']
type SortKey = 'commodity' | 'volume' | 'window' | 'status'
type Decision = 'accepted' | 'declined'

const STATUS_FILTERS: StatusFilter[] = ['all', 'pending', 'accepted', 'declined', 'withdrawn']

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: 'Semua', pending: 'Menunggu', accepted: 'Diterima',
  declined: 'Ditolak', withdrawn: 'Ditarik',
}

const STATUS_TONE: Record<SupplyRequest['status'], 'neutral' | 'positive' | 'negative' | 'warning'> = {
  pending: 'warning', accepted: 'positive', declined: 'negative', withdrawn: 'neutral',
}

/**
 * Answers requests directly from the browser rather than through an inline
 * Server Action inside a Server Component.
 *
 * That older pattern could only report a failure by throwing, and Next strips
 * a thrown Server Action's message in production (see lib/actions/result.ts) --
 * so a refused accept looked like a click that did nothing. Calling the action
 * here and reading its returned ActionResult as data, instead of catching a
 * throw, is what lets the reason ("melebihi proyeksi", "sudah tidak ada")
 * reach the row that was clicked.
 */
export function RequestsTable({
  rows: initialRows, commodityName,
}: {
  rows: SupplyRequest[]
  commodityName: Map<string, string>
}) {
  const [rows, setRows] = useState(initialRows)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('window')
  const [sortDesc, setSortDesc] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rowErrors, setRowErrors] = useState<Map<string, string>>(new Map())
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(
    () => rows.filter(r => statusFilter === 'all' || r.status === statusFilter),
    [rows, statusFilter],
  )

  const sorted = useMemo(() => {
    const compare: Record<SortKey, (a: SupplyRequest, b: SupplyRequest) => number> = {
      commodity: (a, b) =>
        (commodityName.get(a.commodityId) ?? '').localeCompare(commodityName.get(b.commodityId) ?? ''),
      volume: (a, b) => a.volumeKg - b.volumeKg,
      window: (a, b) => a.windowStart.localeCompare(b.windowStart),
      status: (a, b) => a.status.localeCompare(b.status),
    }
    const copy = [...filtered].sort(compare[sortKey])
    if (sortDesc) copy.reverse()
    return copy
  }, [filtered, sortKey, sortDesc, commodityName])

  const pendingIds = useMemo(
    () => new Set(sorted.filter(r => r.status === 'pending').map(r => r.id)),
    [sorted],
  )
  const selectedPending = [...selected].filter(id => pendingIds.has(id))
  const allPendingSelected = pendingIds.size > 0 && selectedPending.length === pendingIds.size

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(desc => !desc)
    else { setSortKey(key); setSortDesc(false) }
  }

  function toggleSelected(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function respond(ids: string[], decision: Decision) {
    startTransition(async () => {
      const results = await Promise.all(
        ids.map(async id => [id, await respondToRequest({ requestId: id, decision })] as const),
      )

      setRowErrors(prev => {
        const next = new Map(prev)
        for (const [id, result] of results) {
          if (result.ok) next.delete(id)
          else next.set(id, result.message)
        }
        return next
      })
      setRows(prev => prev.map(r => {
        const outcome = results.find(([id]) => id === r.id)?.[1]
        return outcome?.ok ? { ...r, status: decision } : r
      }))
      setSelected(prev => {
        const next = new Set(prev)
        for (const [id, result] of results) if (result.ok) next.delete(id)
        return next
      })
    })
  }

  if (rows.length === 0) return <EmptyState {...INBOX_EMPTY} />

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map(filter => (
          <Button
            key={filter}
            type="button"
            size="sm"
            variant={statusFilter === filter ? 'default' : 'outline'}
            onClick={() => setStatusFilter(filter)}
          >
            {STATUS_LABEL[filter]}
          </Button>
        ))}
      </div>

      {selectedPending.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
          <span>{selectedPending.length} permintaan dipilih</span>
          <Button size="sm" disabled={isPending} onClick={() => respond(selectedPending, 'accepted')}>
            Terima terpilih
          </Button>
          <Button
            size="sm" variant="outline" disabled={isPending}
            onClick={() => respond(selectedPending, 'declined')}
          >
            Tolak terpilih
          </Button>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Tidak ada permintaan berstatus {STATUS_LABEL[statusFilter].toLowerCase()}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="w-9 px-3 py-2">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={allPendingSelected}
                    disabled={pendingIds.size === 0}
                    aria-label="Pilih semua yang menunggu"
                    onChange={() => setSelected(allPendingSelected ? new Set() : new Set(pendingIds))}
                  />
                </th>
                <SortHeader
                  label="Komoditas" columnKey="commodity"
                  activeKey={sortKey} desc={sortDesc} onSort={toggleSort}
                />
                <th className="px-3 py-2 font-medium">Pembeli</th>
                <SortHeader
                  label="Volume" columnKey="volume"
                  activeKey={sortKey} desc={sortDesc} onSort={toggleSort}
                />
                <SortHeader
                  label="Jendela panen" columnKey="window"
                  activeKey={sortKey} desc={sortDesc} onSort={toggleSort}
                />
                <SortHeader
                  label="Status" columnKey="status"
                  activeKey={sortKey} desc={sortDesc} onSort={toggleSort}
                />
                <th className="px-3 py-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.id} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2 align-top">
                    {r.status === 'pending' && (
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={selected.has(r.id)}
                        aria-label={`Pilih permintaan ${r.id}`}
                        onChange={() => toggleSelected(r.id)}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 align-top font-medium text-foreground">
                    {commodityName.get(r.commodityId) ?? 'Komoditas'}
                  </td>
                  <td className="max-w-64 px-3 py-2 align-top text-muted-foreground">
                    {requestBuyerLabel(r.buyerName, r.buyerOrganisation)}
                    {r.notes && (
                      <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs">{r.notes}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top tabular-nums text-foreground">
                    {formatNumberId(r.volumeKg / 1000)} ton
                  </td>
                  <td className="px-3 py-2 align-top">
                    <HarvestWindow
                      size="sm"
                      week={{ start: utcDate(r.windowStart), end: utcDate(r.windowEnd), basis: 'observed' }}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  </td>
                  <td className="min-w-40 px-3 py-2 align-top">
                    {r.status === 'pending' ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-2">
                          <Button size="sm" disabled={isPending} onClick={() => respond([r.id], 'accepted')}>
                            Terima
                          </Button>
                          <Button
                            size="sm" variant="outline" disabled={isPending}
                            onClick={() => respond([r.id], 'declined')}
                          >
                            Tolak
                          </Button>
                        </div>
                        {rowErrors.has(r.id) && (
                          <p className="text-xs text-destructive">{rowErrors.get(r.id)}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {r.respondedAt ? formatDateId(utcDate(r.respondedAt)) : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SortHeader({
  label, columnKey, activeKey, desc, onSort,
}: {
  label: string
  columnKey: SortKey
  activeKey: SortKey
  desc: boolean
  onSort: (key: SortKey) => void
}) {
  const active = columnKey === activeKey
  return (
    <th className="px-3 py-2 font-medium">
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {active && <span aria-hidden>{desc ? '▼' : '▲'}</span>}
      </button>
    </th>
  )
}

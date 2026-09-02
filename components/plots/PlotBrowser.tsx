'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { commodityColour } from '@/lib/plots/colour'
import {
  DEFAULT_FILTER, filterPlots, isDefaultFilter, parsePlotFilter, plotFilterParams,
  type Horizon, type PlotFilter, type SortKey,
} from '@/lib/plots/filter'
import type { PlotSummary } from '@/lib/plots/summary'
import { cn } from '@/lib/utils'
import { PlotCard, type CommodityRef } from './PlotCard'

const HORIZONS: { value: Horizon; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: '30', label: '30 hari' },
  { value: '90', label: '90 hari' },
  { value: 'season', label: 'Musim ini' },
]

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'harvest', label: 'Panen terdekat' },
  { value: 'name', label: 'Nama' },
  { value: 'area', label: 'Luas' },
]

/**
 * The plot list and the controls that narrow it.
 *
 * Filtering happens here rather than on the server because a cooperative has
 * tens of plots, and a round trip per keystroke on a village connection costs
 * more than sending the whole list once. The rules themselves are pure
 * functions in lib/plots/filter.ts; this owns only the state and the URL.
 */
export function PlotBrowser({
  plots, commodities, onRegisterClick,
}: {
  plots: PlotSummary[]
  commodities: CommodityRef[]
  onRegisterClick?: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [filter, setFilter] = useState<PlotFilter>(() => parsePlotFilter(searchParams))

  // Keep the address bar in step, so a filtered list can be sent to somebody.
  //
  // The native History API rather than `router.replace`, which is what Next
  // documents for search-param-only updates and what this needs: the list is
  // already filtered in the browser, so a router navigation would ask the
  // server to re-render a page whose output cannot change -- on a
  // force-dynamic route, once per keystroke. replaceState still syncs
  // usePathname and useSearchParams, and being a replace it keeps three typed
  // letters from becoming three entries in the back button.
  useEffect(() => {
    const query = plotFilterParams(filter).toString()
    window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname)
  }, [filter, pathname])

  const byId = useMemo(() => new Map(commodities.map(c => [c.id, c])), [commodities])

  // Only commodities somebody is actually growing. A chip for a crop no plot
  // has is a filter that can only ever empty the list.
  const grown = useMemo(() => {
    const ids = new Set(plots.flatMap(p => p.commodityIds))
    return commodities.filter(c => ids.has(c.id))
  }, [plots, commodities])

  const shown = useMemo(() => filterPlots(plots, filter), [plots, filter])

  const toggleCommodity = (id: string) => setFilter(f => ({
    ...f,
    commodityIds: f.commodityIds.includes(id)
      ? f.commodityIds.filter(x => x !== id)
      : [...f.commodityIds, id],
  }))

  // Nothing registered at all: no point showing controls that filter nothing.
  if (plots.length === 0) {
    return (
      <EmptyState
        title="Belum ada lahan terdaftar"
        description="Daftarkan lahan pertama untuk mulai memperkirakan jendela panen."
        action={
          onRegisterClick ? (
            <button type="button" onClick={onRegisterClick} className={buttonVariants()}>
              Daftarkan lahan
            </button>
          ) : (
            <Link href="/plots?new=1" className={buttonVariants()}>Daftarkan lahan</Link>
          )
        }
      />
    )
  }

  return (
    <>
      {/* Sticky, because the controls are useless once you have scrolled past
          them and the list is what you scroll. */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-card px-4 py-3.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={filter.query}
            onChange={e => setFilter(f => ({ ...f, query: e.target.value }))}
            placeholder="Cari lahan atau nama petani"
            aria-label="Cari lahan atau nama petani"
            className="min-w-64 flex-1 rounded-xl border border-border bg-card px-3.5 py-2 text-sm
              outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />

          <select
            value={filter.sort}
            onChange={e => setFilter(f => ({ ...f, sort: e.target.value as SortKey }))}
            aria-label="Urutkan"
            className="rounded-xl border border-border bg-card px-3.5 py-2 text-sm
              outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {SORTS.map(s => <option key={s.value} value={s.value}>Urut: {s.label}</option>)}
          </select>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <fieldset className="flex flex-wrap items-center gap-1.5">
            <legend className="sr-only">Jendela panen</legend>
            {HORIZONS.map(h => (
              <Chip
                key={h.value}
                active={filter.horizon === h.value}
                onClick={() => setFilter(f => ({ ...f, horizon: h.value }))}
              >
                {h.label}
              </Chip>
            ))}
          </fieldset>

          {grown.length > 1 && (
            <fieldset className="flex flex-wrap items-center gap-1.5">
              <legend className="sr-only">Komoditas</legend>
              {grown.map(c => (
                <Chip
                  key={c.id}
                  active={filter.commodityIds.includes(c.id)}
                  onClick={() => toggleCommodity(c.id)}
                  dot={commodityColour(c.spriteRow)}
                >
                  {c.name}
                </Chip>
              ))}
            </fieldset>
          )}

          <p className="ml-auto text-xs font-semibold text-muted-foreground">
            {isDefaultFilter(filter)
              ? `${plots.length} lahan`
              : `${shown.length} dari ${plots.length} lahan`}
          </p>
        </div>
      </div>

      {shown.length === 0 ? (
        // Deliberately NOT the same sentence as "no plots registered". One
        // means look elsewhere, the other means go and register something.
        <EmptyState
          className="mt-6"
          title="Tidak ada lahan yang cocok"
          description="Tidak ada lahan yang cocok dengan pencarian dan saringan ini."
          action={
            <button
              type="button"
              onClick={() => setFilter(f => ({ ...DEFAULT_FILTER, sort: f.sort }))}
              className={buttonVariants({ variant: 'outline' })}
            >
              Hapus saringan
            </button>
          }
        />
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {shown.map(p => <PlotCard key={p.id} plot={p} commodities={byId} />)}
        </div>
      )}
    </>
  )
}

/** A toggle that reads as a filter rather than a button. */
function Chip({
  active, onClick, dot, children,
}: {
  active: boolean
  onClick: () => void
  dot?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'interactive inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:border-input hover:bg-muted hover:text-foreground',
      )}
    >
      {dot && (
        <span aria-hidden className="size-2 rounded-full" style={{ background: dot }} />
      )}
      {children}
    </button>
  )
}

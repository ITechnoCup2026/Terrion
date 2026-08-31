import Link from 'next/link'
import type { ReactNode } from 'react'

import { ListingCard } from '@/components/commerce/ListingCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { CATALOG_EMPTY, FILTERS_EMPTY } from '@/lib/catalog/copy'
import type { ListingFilters } from '@/lib/catalog/listings'
import { loadCatalogListings } from '@/lib/catalog/load'

export const metadata = { title: 'Katalog pasokan' }

// No route-segment caching here: this page reads searchParams for its filters,
// which is a dynamic API, so the page renders per request whatever a revalidate
// export claimed. The expensive part -- one projection per cooperative -- is
// cached inside loadCatalogListings instead, which is the layer that can be.

const field =
  'interactive h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:border-ring/40 focus:border-ring focus:outline-none'

// A single search param as a string, ignoring repeats.
function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

// A labeled filter field. The label sits above the control instead of relying
// on aria-label alone: a buyer scanning the bar for "which one is province"
// should not have to hover each control to find out.
function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[0.7rem] font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams

  const filters: ListingFilters = {
    commodityId: one(params.komoditas) || undefined,
    province: one(params.provinsi) || undefined,
    weeksAhead: one(params.minggu) ? Number(one(params.minggu)) : undefined,
    minTonnes: one(params.minTon) ? Number(one(params.minTon)) : undefined,
  }
  const hasActiveFilter = Boolean(
    filters.commodityId || filters.province || filters.weeksAhead || filters.minTonnes,
  )

  // Two calls only when a filter narrows the view: the header's "penawaran"
  // count and the empty-state's "nothing exists vs nothing matches" both need
  // the unfiltered total, which /api/catalog's own hourly cache makes cheap.
  const { listings, commodities, provinces } = await loadCatalogListings()
  const shown = hasActiveFilter
    ? (await loadCatalogListings(filters)).listings
    : listings

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Katalog pasokan
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Panen yang diproyeksikan koperasi dalam 12 minggu ke depan. Setiap kartu
            adalah satu komoditas pada satu minggu panen — pilih satu untuk mengajukan
            kontrak pasokan.
          </p>
        </div>

        {/* A quiet scale-setter: it tells a first-time buyer this is a real,
            populated market before they touch a single filter. */}
        <div className="flex shrink-0 gap-4 rounded-xl border border-border bg-card px-4 py-2.5">
          <div>
            <p className="font-mono text-lg font-medium leading-none text-foreground">
              {listings.length}
            </p>
            <p className="mt-1 text-[0.7rem] text-muted-foreground">penawaran</p>
          </div>
          <div className="w-px bg-border" aria-hidden />
          <div>
            <p className="font-mono text-lg font-medium leading-none text-foreground">
              {commodities.length}
            </p>
            <p className="mt-1 text-[0.7rem] text-muted-foreground">komoditas</p>
          </div>
        </div>
      </header>

      {/* A filter bar, not a form card: it sticks under the header so a buyer
          deep in the grid can narrow without scrolling back up. */}
      <form
        method="get"
        className="sticky top-[3.75rem] z-30 -mx-4 mt-6 flex flex-wrap items-end gap-3 border-y border-border bg-background/90 px-4 py-3 shadow-sm backdrop-blur-md"
      >
        <Field label="Komoditas" htmlFor="f-komoditas">
          <select id="f-komoditas" name="komoditas" defaultValue={filters.commodityId ?? ''} className={field}>
            <option value="">Semua komoditas</option>
            {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <Field label="Provinsi" htmlFor="f-provinsi">
          <select id="f-provinsi" name="provinsi" defaultValue={filters.province ?? ''} className={field}>
            <option value="">Semua provinsi</option>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>

        <Field label="Rentang waktu" htmlFor="f-minggu">
          <select id="f-minggu" name="minggu" defaultValue={String(filters.weeksAhead ?? '')} className={field}>
            <option value="">Semua minggu</option>
            <option value="4">4 minggu ke depan</option>
            <option value="8">8 minggu ke depan</option>
          </select>
        </Field>

        <Field label="Min. tonase" htmlFor="f-ton">
          <input
            id="f-ton" name="minTon" type="number" min="0" step="0.1"
            className={`${field} w-28`} placeholder="0"
            defaultValue={filters.minTonnes ?? ''}
          />
        </Field>

        <button
          type="submit"
          className="interactive h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Terapkan
        </button>

        {hasActiveFilter && (
          <Link
            href="/catalog"
            className="interactive h-9 rounded-lg px-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Hapus filter
          </Link>
        )}

        {/* The count is the filter's own feedback: without it, narrowing to
            nothing looks identical to the page failing to load. */}
        <p className="ml-auto self-center text-xs text-muted-foreground" aria-live="polite">
          <span className="font-medium text-foreground">{shown.length}</span> dari {listings.length} penawaran
        </p>
      </form>

      {shown.length === 0 ? (
        // "Nothing matches" and "nothing exists" are different facts.
        <EmptyState
          className="mt-8"
          {...(listings.length === 0 ? CATALOG_EMPTY : FILTERS_EMPTY)}
          action={
            hasActiveFilter && (
              <Link
                href="/catalog"
                className="interactive inline-flex h-9 items-center rounded-lg border border-input bg-background px-4 text-sm font-medium text-foreground hover:border-ring/40"
              >
                Hapus semua filter
              </Link>
            )
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}
        </div>
      )}
    </div>
  )
}

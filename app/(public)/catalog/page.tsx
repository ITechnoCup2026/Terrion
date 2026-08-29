import { ListingCard } from '@/components/commerce/ListingCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { CATALOG_EMPTY, FILTERS_EMPTY } from '@/lib/catalog/copy'
import { filterListings, type ListingFilters } from '@/lib/catalog/listings'
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

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const now = new Date()

  const { listings, commodities, provinces } = await loadCatalogListings(now)

  const filters: ListingFilters = {
    commodityId: one(params.komoditas) || undefined,
    province: one(params.provinsi) || undefined,
    weeksAhead: one(params.minggu) ? Number(one(params.minggu)) : undefined,
    minTonnes: one(params.minTon) ? Number(one(params.minTon)) : undefined,
  }
  const shown = filterListings(listings, filters, now)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Katalog pasokan
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Panen yang diproyeksikan koperasi dalam 12 minggu ke depan. Setiap kartu
          adalah satu komoditas pada satu minggu panen — pilih satu untuk mengajukan
          kontrak pasokan.
        </p>
      </header>

      {/* A filter bar, not a form card: it sticks under the header so a buyer
          deep in the grid can narrow without scrolling back up. */}
      <form
        method="get"
        className="sticky top-[3.75rem] z-30 -mx-4 mt-6 flex flex-wrap items-center gap-2 border-y border-border bg-background/90 px-4 py-3 backdrop-blur-md"
      >
        <select name="komoditas" defaultValue={filters.commodityId ?? ''} className={field} aria-label="Komoditas">
          <option value="">Semua komoditas</option>
          {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select name="provinsi" defaultValue={filters.province ?? ''} className={field} aria-label="Provinsi">
          <option value="">Semua provinsi</option>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select name="minggu" defaultValue={String(filters.weeksAhead ?? '')} className={field} aria-label="Rentang minggu">
          <option value="">Semua minggu</option>
          <option value="4">4 minggu ke depan</option>
          <option value="8">8 minggu ke depan</option>
        </select>

        <input
          name="minTon" type="number" min="0" step="0.1" aria-label="Minimum tonase"
          className={`${field} w-28`} placeholder="Min. ton"
          defaultValue={filters.minTonnes ?? ''}
        />

        <button
          type="submit"
          className="interactive h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Terapkan
        </button>

        {/* The count is the filter's own feedback: without it, narrowing to
            nothing looks identical to the page failing to load. */}
        <p className="ml-auto text-xs text-muted-foreground" aria-live="polite">
          {shown.length} dari {listings.length} penawaran
        </p>
      </form>

      {shown.length === 0 ? (
        // "Nothing matches" and "nothing exists" are different facts.
        <EmptyState className="mt-8" {...(listings.length === 0 ? CATALOG_EMPTY : FILTERS_EMPTY)} />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}
        </div>
      )}
    </div>
  )
}

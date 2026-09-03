import { RotateCcw, Search } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ListingCard } from '@/components/commerce/ListingCard'
import { SupplyRuler } from '@/components/landing/SupplyRuler'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { isBackendDown } from '@/lib/api/client'
import { currentAppUser, type AppUser } from '@/lib/auth/session'
import { CATALOG_EMPTY, FILTERS_EMPTY } from '@/lib/catalog/copy'
import type { ListingFilters } from '@/lib/catalog/listings'
import { loadCatalogListings } from '@/lib/catalog/load'

export const metadata = { title: 'Katalog Pasokan Panen' }

const selectFieldStyle =
  'interactive h-10 rounded-xl border border-input bg-card px-3.5 text-xs font-medium text-foreground hover:border-[var(--terrion-green-300)] focus:border-ring focus:outline-none transition-colors shadow-2xs'

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  let user: AppUser | null = null
  try {
    user = await currentAppUser()
  } catch (error) {
    if (!isBackendDown(error)) throw error
  }

  if (user && user.role !== 'buyer') {
    redirect('/dashboard')
  }

  const params = await searchParams

  const queryParam = one(params.q) ?? ''
  const commodityParam = one(params.komoditas) ?? ''
  const provinceParam = one(params.provinsi) ?? ''
  const weeksParam = one(params.minggu) ?? ''
  const minTonParam = one(params.minTon) ?? ''

  const filters: ListingFilters = {
    commodityId: commodityParam || undefined,
    province: provinceParam || undefined,
    weeksAhead: weeksParam ? Number(weeksParam) : undefined,
    minTonnes: minTonParam ? Number(minTonParam) : undefined,
  }
  const hasActiveFilter = Boolean(
    queryParam || filters.commodityId || filters.province || filters.weeksAhead || filters.minTonnes,
  )

  const { listings, commodities, provinces } = await loadCatalogListings()
  let shown = hasActiveFilter
    ? (await loadCatalogListings(filters)).listings
    : listings

  // Filter in memory by search query if provided
  if (queryParam) {
    const q = queryParam.toLowerCase()
    shown = shown.filter(
      l =>
        l.commodityName.toLowerCase().includes(q) ||
        (l.varietyName && l.varietyName.toLowerCase().includes(q)) ||
        l.cooperativeName.toLowerCase().includes(q) ||
        l.province.toLowerCase().includes(q) ||
        l.district.toLowerCase().includes(q),
    )
  }

  const heaviest = shown.reduce((most, l) => Math.max(most, l.tonnes), 0)

  return (
    <div className="flex w-full flex-1 flex-col bg-background pb-16">
      {/* ─── MARKETPLACE TOP BAR / HEADER ───────────────────────────────────── */}
      <div className="border-b border-border/60 bg-gradient-to-b from-[var(--terrion-green-50)]/40 via-background to-background py-8">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Katalog Pasokan Panen
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Proyeksi pasokan panen terverifikasi langsung dari koperasi tani Indonesia.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ─── SEARCH & FILTER TOOLBAR ──────────────────────────────────────── */}
        <section className="sticky top-[var(--public-header)] z-30 -mx-4 mt-6 border-b border-border/80 bg-background/95 p-3.5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 shadow-xs">
          <form method="get" className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                name="q"
                defaultValue={queryParam}
                placeholder="Cari komoditas, varietas, atau koperasi..."
                className="interactive h-10 w-full rounded-xl border border-input bg-card pl-10 pr-3.5 text-xs font-medium text-foreground placeholder:text-muted-foreground hover:border-[var(--terrion-green-300)] focus:border-ring focus:outline-none transition-colors shadow-2xs"
              />
            </div>

            {/* Commodity Select */}
            <select
              name="komoditas"
              defaultValue={commodityParam}
              className={selectFieldStyle}
              aria-label="Filter Komoditas"
            >
              <option value="">Semua komoditas</option>
              {commodities.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Province Select */}
            <select
              name="provinsi"
              defaultValue={provinceParam}
              className={selectFieldStyle}
              aria-label="Filter Provinsi"
            >
              <option value="">Semua provinsi</option>
              {provinces.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Weeks Select */}
            <select
              name="minggu"
              defaultValue={weeksParam}
              className={selectFieldStyle}
              aria-label="Filter Rentang Waktu"
            >
              <option value="">Semua minggu panen</option>
              <option value="4">4 minggu ke depan</option>
              <option value="8">8 minggu ke depan</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilter && (
              <Link
                href="/catalog"
                className="interactive h-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-2xs"
              >
                <RotateCcw className="size-3.5" />
                Reset Filter
              </Link>
            )}

            <div className="ml-auto text-xs font-semibold text-muted-foreground">
              Menampilkan <span className="font-bold text-[var(--terrion-green-700)] tabular-nums">{shown.length}</span> produk pasokan
            </div>
          </form>
        </section>

        {/* ─── MARKETPLACE PRODUCT GRID ────────────────────────────────────── */}
        <section className="mt-6">
          {shown.length === 0 ? (
            <EmptyState
              className="mt-8"
              {...(listings.length === 0 ? CATALOG_EMPTY : FILTERS_EMPTY)}
              action={
                hasActiveFilter && (
                  <Link href="/catalog" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                    Reset filter
                  </Link>
                )
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map(l => (
                <ListingCard key={l.id} listing={l} max={heaviest} />
              ))}
            </div>
          )}
        </section>

        {/* ─── OPTIONAL COLLAPSIBLE SUPPLY TIMELINE ──────────────────────────── */}
        {listings.length > 0 && (
          <details className="group mt-12 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
            <summary className="interactive flex cursor-pointer items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--terrion-green-700)]">
              <span>Lihat Grafik Lini Masa Ketersediaan Pasokan (12 Minggu)</span>
              <span className="text-muted-foreground transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="mt-4 pt-4 border-t border-border/80">
              <SupplyRuler listings={listings} />
            </div>
          </details>
        )}


      </div>
    </div>
  )
}


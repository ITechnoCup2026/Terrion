import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { Filter, Layers, Sprout, Store } from 'lucide-react'

import { ListingCard } from '@/components/commerce/ListingCard'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Page, PageHeader } from '@/components/ui/Page'
import { isBackendDown } from '@/lib/api/client'
import { currentAppUser, type AppUser } from '@/lib/auth/session'
import { CATALOG_EMPTY, FILTERS_EMPTY } from '@/lib/catalog/copy'
import type { ListingFilters } from '@/lib/catalog/listings'
import { loadCatalogListings } from '@/lib/catalog/load'

export const metadata = { title: 'Katalog Pasokan Panen' }

const field =
  'interactive h-9 rounded-xl border border-input bg-background/80 px-3 text-xs font-medium text-foreground hover:border-primary/40 focus:border-ring focus:outline-none transition-colors'

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
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

  const filters: ListingFilters = {
    commodityId: one(params.komoditas) || undefined,
    province: one(params.provinsi) || undefined,
    weeksAhead: one(params.minggu) ? Number(one(params.minggu)) : undefined,
    minTonnes: one(params.minTon) ? Number(one(params.minTon)) : undefined,
  }
  const hasActiveFilter = Boolean(
    filters.commodityId || filters.province || filters.weeksAhead || filters.minTonnes,
  )

  const { listings, commodities, provinces } = await loadCatalogListings()
  const shown = hasActiveFilter
    ? (await loadCatalogListings(filters)).listings
    : listings

  return (
    <Page width="wide">
      <PageHeader
        title="Katalog Pasokan Panen"
        description={
          <>
            Panen yang diproyeksikan oleh koperasi petani dalam 12 minggu ke depan. Pilih komoditas panen untuk mengajukan kontrak pasokan secara langsung.
          </>
        }
        actions={
          <Card pad="none" className="flex gap-4 border-emerald-200/50 bg-emerald-50/40 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 px-1">
              <Store className="size-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-mono text-lg font-bold leading-none text-foreground">
                  {listings.length}
                </p>
                <p className="mt-0.5 text-[0.68rem] font-medium text-muted-foreground">penawaran</p>
              </div>
            </div>
            <div className="w-px bg-border" aria-hidden />
            <div className="flex items-center gap-2 px-1">
              <Sprout className="size-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-mono text-lg font-bold leading-none text-foreground">
                  {commodities.length}
                </p>
                <p className="mt-0.5 text-[0.68rem] font-medium text-muted-foreground">komoditas</p>
              </div>
            </div>
          </Card>
        }
      />

      {/* Glassmorphic Sticky Filter Bar */}
      <form
        method="get"
        className="sticky top-[var(--public-header)] z-30 -mx-4 mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border/80 bg-background/85 px-4 py-3.5 shadow-sm backdrop-blur-md"
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

        <Field label="Rentang Waktu" htmlFor="f-minggu">
          <select id="f-minggu" name="minggu" defaultValue={String(filters.weeksAhead ?? '')} className={field}>
            <option value="">Semua minggu panen</option>
            <option value="4">4 minggu ke depan</option>
            <option value="8">8 minggu ke depan</option>
          </select>
        </Field>

        <Field label="Min. Tonase" htmlFor="f-ton">
          <input
            id="f-ton" name="minTon" type="number" min="0" step="0.1"
            className={`${field} w-28`} placeholder="0 ton"
            defaultValue={filters.minTonnes ?? ''}
          />
        </Field>

        <button type="submit" className={buttonVariants({ size: 'default' })}>
          <Filter className="mr-1.5 size-3.5" />
          Terapkan Filter
        </button>

        {hasActiveFilter && (
          <Link href="/catalog" className={buttonVariants({ variant: 'ghost', size: 'default' })}>
            Hapus Filter
          </Link>
        )}

        <p className="ml-auto self-center text-xs text-muted-foreground" aria-live="polite">
          Menampilkan <span className="font-semibold text-foreground">{shown.length}</span> dari {listings.length} pasokan
        </p>
      </form>

      {shown.length === 0 ? (
        <EmptyState
          className="mt-8"
          {...(listings.length === 0 ? CATALOG_EMPTY : FILTERS_EMPTY)}
          action={
            hasActiveFilter && (
              <Link href="/catalog" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                Reset Filter
              </Link>
            )
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}
        </div>
      )}
    </Page>
  )
}

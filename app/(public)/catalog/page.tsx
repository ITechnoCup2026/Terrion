import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ListingCard } from '@/components/commerce/ListingCard'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Page, PageHeader } from '@/components/ui/Page'
import { isBackendDown } from '@/lib/api/client'
import { currentAppUser, type AppUser } from '@/lib/auth/session'
import { CATALOG_EMPTY, FILTERS_EMPTY } from '@/lib/catalog/copy'
import type { ListingFilters } from '@/lib/catalog/listings'
import { loadCatalogListings } from '@/lib/catalog/load'

export const metadata = { title: 'Katalog pasokan panen' }

const field =
  'interactive h-8 rounded-md border border-input bg-card px-2.5 text-[0.8125rem] text-foreground hover:border-[var(--terrion-ink-faint)] focus:border-ring focus:outline-none'

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/** A labelled control in the filter strip. Sentence case: a tracked-out
 *  capitalised word above a select makes the label louder than the value. */
function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[0.6875rem] text-muted-foreground">
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

  // Each card's bar is a share of the heaviest offer CURRENTLY SHOWN, so the
  // scale re-fits as the buyer narrows the list -- which is the moment the
  // comparison is worth anything.
  const heaviest = shown.reduce((most, l) => Math.max(most, l.tonnes), 0)

  return (
    <Page width="wide">
      {/* The two counts are a sentence, not a widget. They were a tinted card
          in the header holding two mono figures with icons -- an object the
          reader had to parse to learn something a clause says in passing. */}
      <PageHeader
        title="Katalog pasokan panen"
        description={
          listings.length > 0
            ? `${listings.length} penawaran dari ${commodities.length} komoditas, diproyeksikan koperasi untuk 12 minggu ke depan. Pilih satu untuk mengajukan kontrak pasokan langsung ke koperasinya.`
            : 'Panen yang diproyeksikan koperasi petani untuk 12 minggu ke depan.'
        }
      />

      {/* Sticky, opaque, and ruled to the page rather than floating over it as
          a frosted card. A blurred bar makes the first row of results legible
          through the control the reader is using. */}
      <form
        method="get"
        className="sticky top-[var(--public-header)] z-30 -mx-4 mt-6 flex flex-wrap items-end gap-3 border-b border-border bg-card px-4 pt-1 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
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
            <option value="">Semua minggu panen</option>
            <option value="4">4 minggu ke depan</option>
            <option value="8">8 minggu ke depan</option>
          </select>
        </Field>

        <Field label="Min. tonase" htmlFor="f-ton">
          <input
            id="f-ton" name="minTon" type="number" min="0" step="0.1"
            className={`${field} w-28`} placeholder="0 ton"
            defaultValue={filters.minTonnes ?? ''}
          />
        </Field>

        <button type="submit" className={buttonVariants({ size: 'default' })}>
          Terapkan filter
        </button>

        {hasActiveFilter && (
          <Link href="/catalog" className={buttonVariants({ variant: 'ghost', size: 'default' })}>
            Hapus filter
          </Link>
        )}

        <p className="ml-auto self-end pb-1.5 text-xs text-muted-foreground" aria-live="polite">
          Menampilkan <span className="tabular-nums text-foreground">{shown.length}</span> dari{' '}
          <span className="tabular-nums">{listings.length}</span> pasokan
        </p>
      </form>

      {shown.length === 0 ? (
        <EmptyState
          className="mt-8"
          {...(listings.length === 0 ? CATALOG_EMPTY : FILTERS_EMPTY)}
          action={
            hasActiveFilter && (
              <Link href="/catalog" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                Hapus filter
              </Link>
            )
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map(l => (
            <ListingCard key={l.id} listing={l} max={heaviest} />
          ))}
        </div>
      )}
    </Page>
  )
}

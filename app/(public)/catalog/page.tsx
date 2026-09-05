import { Calendar, FileText, Filter, Search, X } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ListingCard } from '@/components/commerce/ListingCard'
import { SupplyRuler } from '@/components/landing/SupplyRuler'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Page, PageHeader } from '@/components/ui/Page'
import { isBackendDown } from '@/lib/api/client'
import { currentAppUser, type AppUser } from '@/lib/auth/session'
import { CATALOG_EMPTY, FILTERS_EMPTY } from '@/lib/catalog/copy'
import type { ListingFilters } from '@/lib/catalog/listings'
import { loadCatalogListings } from '@/lib/catalog/load'
import { formatNumberId } from '@/lib/format/number'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Katalog Pasokan Panen · Terrion' }

/**
 * A field's name, and nothing else.
 *
 * It used to carry a glyph apiece -- a sprout over Komoditas, a pin over
 * Provinsi, a pair of scales over Volume -- five icons in a row over five
 * fields that already say what they are. globals.css lists decoration of
 * exactly that kind among the things this product removed on purpose: the
 * chrome's whole job is to stay out of the way of a figure and a date.
 *
 * The one glyph that survived is the magnifier INSIDE the search box, which
 * is an affordance rather than an ornament: it says what typing there does.
 */
const fieldLabel = 'mb-1.5 block text-xs font-medium text-muted-foreground'

const field =
  'interactive h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-[var(--terrion-green-300)] focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25'

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
  const shownTonnes = shown.reduce((sum, l) => sum + l.tonnes, 0)

  // What is currently narrowing the list, as one record, so a chip can be
  // built from it and a link back can be built without it.
  const active = {
    q: queryParam,
    komoditas: commodityParam,
    provinsi: provinceParam,
    minggu: weeksParam,
    minTon: minTonParam,
  }

  /**
   * This same page with one filter dropped.
   *
   * The chips used to be five inert grey labels: they named what was
   * narrowing the list and offered no way to widen it again, so a reader who
   * wanted one of five filters gone had to find the matching select and put
   * it back to "Semua" by hand, or clear all five. A chip that looks like a
   * control and is not one is worse than no chip.
   *
   * A plain link, because the filter bar is a GET form and works with no
   * JavaScript at all -- taking a filter off has to work the same way.
   */
  function hrefWithout(drop: keyof typeof active): string {
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(active)) {
      if (value && key !== drop) next.set(key, value)
    }
    const query = next.toString()
    return query ? `/catalog?${query}` : '/catalog'
  }

  // Name and value kept apart so the chip can print the name quietly and the
  // value in ink: "Provinsi Jawa Barat" reads at a glance, where a row of
  // bare values leaves "Padi" ambiguous between a commodity and a variety.
  const chips: { param: keyof typeof active; name: string; value: string }[] = []
  if (queryParam) chips.push({ param: 'q', name: 'Kata kunci', value: `\u201c${queryParam}\u201d` })
  if (commodityParam) {
    chips.push({
      param: 'komoditas',
      name: 'Komoditas',
      value: commodities.find(c => c.id === commodityParam)?.name ?? commodityParam,
    })
  }
  if (provinceParam) chips.push({ param: 'provinsi', name: 'Provinsi', value: provinceParam })
  if (weeksParam) chips.push({ param: 'minggu', name: 'Panen', value: `${weeksParam} minggu ke depan` })
  if (minTonParam) chips.push({ param: 'minTon', name: 'Volume', value: `\u2265 ${minTonParam} ton` })

  return (
    <Page className="flex max-w-7xl flex-col gap-6 pb-16">
      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <PageHeader
        title="Katalog pasokan panen"
        description="Proyeksi ketersediaan komoditas panen dari koperasi tani mitra 12 minggu ke depan untuk pengadaan langsung off-taker tanpa tengkulak."
        actions={
          user?.role === 'buyer' ? (
            <Link
              href="/my-requests"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'interactive gap-2 font-medium hover:bg-[var(--terrion-green-50)]',
              )}
            >
              <FileText className="size-4 text-[var(--terrion-green-600)]" />
              Permintaan Saya
            </Link>
          ) : undefined
        }
      />

      {/* ─── FILTERS ────────────────────────────────────────────────────── */}
      {/*
        One row, not two.

        The bar used to spend an entire second row on a submit button at one
        end and a green count pill at the other, with a thousand pixels of
        nothing between them -- and the bar is sticky, so that empty band
        followed the reader down the whole list it was there to filter. The
        button moved up into the field row, and the count moved out of the
        form altogether: a result is not a control, and it now introduces the
        results instead of sitting among the things that produce them.

        The tint went with it. Green means "the cooperative's own" everywhere
        else in this product; a count of rows is a fact, not a state, and a
        fact in a green pill reads as something that happened. The backdrop
        blur went too -- globals.css lists it among the things removed on
        purpose, because a frosted surface says "layer above" and this is a
        control panel sitting in the page, not floating over it.
      */}
      <form
        method="get"
        className="sticky top-[var(--public-header)] z-30 rounded-lg border border-border bg-card p-4 shadow-xs sm:p-5"
      >
        <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.75fr)_repeat(4,minmax(0,1fr))_auto]">
          <div>
            <label htmlFor="catalog-q" className={fieldLabel}>
              Cari kata kunci
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="catalog-q"
                type="search"
                name="q"
                defaultValue={queryParam}
                placeholder="Komoditas, varietas, atau koperasi"
                className={`${field} pl-9.5`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="catalog-komoditas" className={fieldLabel}>
              Komoditas
            </label>
            <select id="catalog-komoditas" name="komoditas" defaultValue={commodityParam} className={field}>
              <option value="">Semua komoditas</option>
              {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="catalog-provinsi" className={fieldLabel}>
              Provinsi
            </label>
            <select id="catalog-provinsi" name="provinsi" defaultValue={provinceParam} className={field}>
              <option value="">Semua provinsi</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="catalog-minggu" className={fieldLabel}>
              Minggu panen
            </label>
            <select id="catalog-minggu" name="minggu" defaultValue={weeksParam} className={field}>
              <option value="">Semua (12 minggu)</option>
              <option value="2">2 minggu ke depan</option>
              <option value="4">4 minggu ke depan</option>
              <option value="8">8 minggu ke depan</option>
            </select>
          </div>

          <div>
            <label htmlFor="catalog-min-ton" className={fieldLabel}>
              Volume minimum
            </label>
            <select id="catalog-min-ton" name="minTon" defaultValue={minTonParam} className={field}>
              <option value="">Berapa pun</option>
              <option value="1">≥ 1 ton</option>
              <option value="5">≥ 5 ton</option>
              <option value="10">≥ 10 ton</option>
              <option value="25">≥ 25 ton</option>
            </select>
          </div>

          {/* self-end, because every other cell in this row is a label sitting
              above a field: without it the button stretches to cover the
              label's line too and stands a head taller than the inputs it
              submits. */}
          <button
            type="submit"
            className={cn(
              buttonVariants({ size: 'default' }),
              'interactive h-10 self-end bg-[var(--terrion-green-700)] font-medium text-white shadow-xs hover:bg-[var(--terrion-green-900)]',
            )}
          >
            <Filter className="mr-1.5 size-3.5" />
            Terapkan
          </button>
        </div>

        {hasActiveFilter && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-3.5">
            <span className="mr-1 text-[0.6875rem] font-medium text-muted-foreground">
              Filter aktif
            </span>

            {chips.map(chip => (
              <Link
                key={chip.param}
                href={hrefWithout(chip.param)}
                aria-label={`Hapus filter ${chip.name}: ${chip.value}`}
                className="interactive group/chip inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 py-1 pr-1.5 pl-2.5 text-xs text-foreground hover:border-input hover:bg-muted"
              >
                <span>
                  <span className="text-muted-foreground">{chip.name}</span> {chip.value}
                </span>
                <X
                  aria-hidden
                  className="size-3 shrink-0 text-muted-foreground transition-colors group-hover/chip:text-foreground"
                />
              </Link>
            ))}

            <Link
              href="/catalog"
              className="interactive ml-1 text-[0.6875rem] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Hapus semua
            </Link>
          </div>
        )}
      </form>

      {/* ─── GRID LISTINGS ─────────────────────────────────────────────────── */}
      {shown.length === 0 ? (
        <EmptyState
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
        <div className="flex flex-col gap-3">
          {/* Where the green count pill ended up. It introduces the grid it
              counts instead of sitting inside the form, and it is ink rather
              than green: the figures are what the reader is here for, so they
              carry the weight and the words around them stay quiet. */}
          <p className="text-xs text-muted-foreground">
            Menampilkan{' '}
            <span className="font-medium tabular-nums text-foreground">{shown.length}</span> pasokan
            {' \u00b7 '}
            <span className="font-medium tabular-nums text-foreground">
              {formatNumberId(shownTonnes)}
            </span>{' '}
            ton
            {/* Only when the filter actually took something away. A filter
                that happens to match everything printed "4 pasokan ... dari 4
                pasokan di katalog", which reads as an arithmetic mistake. */}
            {shown.length < listings.length && (
              <>
                {' dari '}
                <span className="tabular-nums">{listings.length}</span> pasokan di katalog
              </>
            )}
          </p>

          <ul className="grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map(l => (
              <li key={l.id} className="flex">
                <ListingCard listing={l} max={heaviest} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── TIMELINE RULER ──────────────────────────────────────────────── */}
      {listings.length > 0 && (
        <details className="group rounded-lg border border-border bg-card p-5 shadow-xs transition-all">
          <summary className="interactive flex cursor-pointer items-center justify-between text-sm font-bold text-foreground">
            <span className="flex items-center gap-2">
              <Calendar className="size-4 text-[var(--terrion-green-600)]" />
              Linimasa Ketersediaan Pasokan Panen (12 Minggu)
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>
          <div className="mt-5 border-t border-border pt-5">
            <SupplyRuler listings={listings} />
          </div>
        </details>
      )}
    </Page>
  )
}

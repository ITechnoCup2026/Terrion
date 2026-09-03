import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Building2, LogIn, MapPin, Store, UserPlus } from 'lucide-react'

import { RequestForm } from '@/components/commerce/RequestForm'
import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { Page } from '@/components/ui/Page'
import { toISODate } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { requestStatusLabel } from '@/lib/catalog/copy'
import { parseListingId } from '@/lib/catalog/listings'
import { loadCooperativeListings } from '@/lib/catalog/load'
import { commodityStyle } from '@/lib/catalog/commodity-style'
import { formatNumberId } from '@/lib/format/number'
import { loadSupplyRequests } from '@/lib/supply-requests/load'

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const user = await currentAppUser()
  if (user && user.role !== 'buyer') {
    redirect('/dashboard')
  }

  const parsed = parseListingId(id)
  if (!parsed) notFound()

  const listings = await loadCooperativeListings(parsed.cooperativeId)
  const listing = listings.find(l => l.id === id)
  if (!listing) notFound()

  const style = commodityStyle(listing.commodityName)

  const existingRequest = user?.role === 'buyer'
    ? (await loadSupplyRequests()).find(r =>
        r.cooperativeId === listing.cooperativeId &&
        r.commodityId === listing.commodityId &&
        r.windowStart === toISODate(listing.weekStart) &&
        r.windowEnd === toISODate(listing.weekEnd) &&
        (r.status === 'pending' || r.status === 'accepted'),
      ) ?? null
    : null

  return (
    <Page width="wide" className="pb-16">
      {/* ─── BREADCRUMB ────────────────────────────────────────────────────── */}
      <nav aria-label="Remah roti" className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Link href="/catalog" className="interactive inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
          <ArrowLeft className="size-3.5" />
          Katalog Pasokan
        </Link>
        <span aria-hidden className="text-muted-foreground/60">/</span>
        <span className="text-foreground font-bold">{listing.commodityName}</span>
      </nav>

      {/* ─── MAIN PRODUCT DETAIL CARD ─────────────────────────────────────── */}
      <div className="mt-6 rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
        <div className="grid gap-8 lg:grid-cols-[16rem_1fr] lg:items-start">
          {/* Crop Identity Icon Box */}
          <div
            className="flex aspect-square w-full max-w-[16rem] items-center justify-center overflow-hidden rounded-2xl border border-border/60 shadow-2xs mx-auto lg:mx-0"
            style={{ backgroundColor: style.tint }}
          >
            {style.image ? (
              <img
                src={style.image}
                alt={listing.commodityName}
                className="size-full object-cover"
              />
            ) : (
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="size-24"
                fill="none"
                stroke={style.hue}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={style.glyph} />
              </svg>
            )}
          </div>

          {/* Details Column */}
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {listing.commodityName}
                {listing.varietyName && (
                  <span className="font-semibold text-muted-foreground"> · {listing.varietyName}</span>
                )}
              </h1>

              <p className="mt-2.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground">
                <MapPin className="size-4 shrink-0 text-[var(--terrion-green-600)]" />
                <span>
                  <strong className="text-foreground">{listing.cooperativeName}</strong> · {listing.village}, {listing.district}, {listing.province}
                </span>
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--terrion-green-50)]/70 p-4 border border-[var(--terrion-green-200)]/60">
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Proyeksi Pasokan Tersedia
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-mono text-3xl font-extrabold text-[var(--terrion-green-700)] tabular-nums">
                    {formatNumberId(listing.tonnes)}
                  </span>
                  <span className="text-xs font-bold text-[var(--terrion-green-700)]">ton</span>
                </div>
                <p className="mt-1 text-[0.6875rem] text-muted-foreground">
                  Total ketersediaan yang diproyeksikan
                </p>
              </div>

              <div className="rounded-xl bg-muted/40 p-4 border border-border/60">
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Perkiraan Jendela Panen
                </span>
                <div className="mt-2">
                  <HarvestWindow
                    size="md"
                    week={{ start: listing.weekStart, end: listing.weekEnd, basis: listing.basis }}
                  />
                </div>
                <p className="mt-1.5 text-[0.6875rem] text-muted-foreground">
                  Rentang waktu estimasi panen lapangan
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ACTION SECTION (FORM / LOGIN CTA) ─────────────────────────────── */}
      {user?.role === 'buyer' ? (
        existingRequest ? (
          <div className="mt-6 rounded-2xl border border-[var(--terrion-green-300)] bg-[var(--terrion-green-50)]/70 p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="badge-tag bg-[var(--terrion-green-200)] text-[var(--terrion-green-900)] font-bold">
                  {requestStatusLabel(existingRequest.status)}
                </span>
                <h3 className="mt-2 text-base font-bold text-foreground">Permintaan Pasokan Telah Terkirim</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Anda sudah mengajukan permintaan untuk panen ini kepada {listing.cooperativeName}.
                </p>
              </div>
              <Link
                href="/my-requests"
                className="pill pill-solid interactive lift bg-[var(--terrion-green-700)] text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-2xs shrink-0 text-center"
              >
                Lihat Permintaan Saya
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-2xs">
            <h2 className="text-base font-bold text-foreground mb-4">Formulir Pengajuan Kontrak Pasokan</h2>
            <RequestForm
              listingId={listing.id}
              projectedTonnes={listing.tonnes}
            />
          </div>
        )
      ) : user ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <Building2 className="size-4" />
            </span>
            <div>
              <p className="font-bold text-amber-900">Anda Masuk Sebagai Akun Koperasi</p>
              <p className="text-amber-700">Hanya akun pembeli terdaftar yang dapat mengajukan kontrak pasokan.</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="pill interactive shrink-0 bg-amber-800 text-white px-4 py-2 font-bold hover:bg-amber-900 text-center"
          >
            Ke Dasbor Koperasi
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-[var(--terrion-green-200)] bg-gradient-to-br from-[var(--terrion-green-50)]/70 via-card to-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--terrion-green-100)] text-[var(--terrion-green-700)]">
                <Store className="size-4" />
              </span>
              <h3 className="text-base font-bold text-foreground">
                Ajukan Kontrak Pasokan Panen Ini
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Masuk atau daftar sebagai pembeli terdaftar untuk langsung mengajukan kontrak permintaan pasokan kepada <strong className="text-foreground">{listing.cooperativeName}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href={`/login?next=${encodeURIComponent(`/catalog/${listing.id}`)}`}
              className="pill pill-solid interactive lift bg-[var(--terrion-green-700)] text-white hover:bg-[var(--terrion-green-900)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-2xs flex items-center gap-1.5"
            >
              <LogIn className="size-3.5" />
              Masuk Pembeli
            </Link>
            <Link
              href="/signup"
              className="pill interactive lift bg-card text-foreground border border-border hover:bg-muted/50 px-5 py-2.5 text-xs font-semibold tracking-wider shadow-2xs flex items-center gap-1.5"
            >
              <UserPlus className="size-3.5" />
              Daftar Akun Pembeli
            </Link>
          </div>
        </div>
      )}
    </Page>
  )
}

import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Building2, Calendar, CheckCircle2, ChevronRight, FileCheck, Info, Lock, MapPin, ShieldCheck, Sparkles, Sprout } from 'lucide-react'

import { RequestForm } from '@/components/commerce/RequestForm'
import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { Badge } from '@/components/ui/Badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Page } from '@/components/ui/Page'
import { toISODate } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { requestStatusLabel } from '@/lib/catalog/copy'
import { parseListingId } from '@/lib/catalog/listings'
import { loadCooperativeListings } from '@/lib/catalog/load'
import { commodityStyle } from '@/lib/catalog/commodity-style'
import { formatNumberId } from '@/lib/format/number'
import { loadSupplyRequests } from '@/lib/supply-requests/load'
import { cn } from '@/lib/utils'

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
    <Page className="flex max-w-7xl flex-col gap-6 pb-16">
      {/* ─── BREADCRUMBS & BACK BUTTON ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <nav aria-label="Remah roti" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href="/catalog"
            className="interactive inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-[var(--terrion-green-700)]"
          >
            <ArrowLeft className="size-3.5" />
            Katalog pasokan
          </Link>
          <ChevronRight aria-hidden className="size-3 text-muted-foreground/60" />
          <span className="font-semibold text-foreground">{listing.commodityName}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="truncate max-w-40 sm:max-w-none">{listing.cooperativeName}</span>
        </nav>
      </div>

      {/* ─── TWO-COLUMN DETAIL GRID ───────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[24rem_minmax(0,1fr)]">
        {/* LEFT COLUMN: Media Showcase & Cooperative Card */}
        <div className="flex flex-col gap-5">
          {/* Main Visual Card */}
          <div className="relative overflow-hidden rounded-lg border border-border/80 bg-card shadow-xs">
            <div
              className="relative aspect-[4/3] w-full overflow-hidden"
              style={{ background: style.tint }}
            >
              {style.image ? (
                <Image
                  src={style.image}
                  alt={listing.commodityName}
                  fill
                  sizes="(min-width: 1024px) 384px, 100vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="size-full p-16"
                  fill="none"
                  stroke={style.hue}
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.75"
                >
                  <path d={style.glyph} />
                </svg>
              )}

              {/* Floating badges */}
              <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-bold text-foreground backdrop-blur-md shadow-xs border border-white/20">
                  <Sprout className="size-3 text-[var(--terrion-green-600)]" />
                  {listing.varietyName ?? 'Varietas Unggul'}
                </span>
                <span className="rounded-full bg-[var(--terrion-green-900)]/85 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-md shadow-xs">
                  {listing.isoWeek.replace('2026-', '')}
                </span>
              </div>
            </div>

            <div className="border-t border-border/70 p-4 bg-muted/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="size-4 text-[var(--terrion-green-600)]" />
                <span>Basis Proyeksi: <strong className="text-foreground capitalize">{listing.basis}</strong> (Terkalibrasi Data Lapangan)</span>
              </div>
            </div>
          </div>

          {/* Cooperative Profile Card */}
          <div className="rounded-lg border border-border/80 bg-card p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--terrion-green-100)] text-[var(--terrion-green-700)]">
                <Building2 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-bold text-foreground">
                    {listing.cooperativeName}
                  </h3>
                  <span title="Koperasi Terverifikasi" className="flex shrink-0">
                    <CheckCircle2
                      aria-label="Koperasi terverifikasi"
                      className="size-3.5 text-[var(--terrion-green-600)]"
                    />
                  </span>
                </div>
                <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 size-3 shrink-0" />
                  <span>{listing.village}, {listing.district}, {listing.province}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[var(--terrion-green-600)] shrink-0" />
                <span>Kemitraan resmi gabungan kelompok tani</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="size-4 text-[var(--terrion-green-600)] shrink-0" />
                <span>Dokumen legalitas & timbang tara terpusat</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Commodity Details & Procurement Action */}
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--terrion-green-700)] mb-1">
              <span>Komoditas Segar Siap Kontrak</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {listing.commodityName}
              {listing.varietyName && (
                <span className="font-normal text-muted-foreground"> · Varietas {listing.varietyName}</span>
              )}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Diproduksi oleh petani binaan {listing.cooperativeName} di wilayah {listing.district}, siap didistribusikan langsung ke fasilitas pemrosesan atau gudang off-taker.
            </p>
          </div>

          {/* Key Figures Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border/80 bg-card p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Estimasi Pasokan Panen
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold tabular-nums text-[var(--terrion-green-700)]">
                  {formatNumberId(listing.tonnes)}
                </span>
                <span className="text-base font-semibold text-muted-foreground">ton</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Berdasarkan luas lahan tanam terdaftar koperasi
              </p>
            </div>

            <div className="rounded-lg border border-border/80 bg-card p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Perkiraan Jendela Panen
              </span>
              <div className="mt-2">
                <HarvestWindow
                  size="md"
                  week={{ start: listing.weekStart, end: listing.weekEnd, basis: listing.basis }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Rentang panen optimal untuk menjaga kesegaran
              </p>
            </div>
          </div>

          {/* ─── PROCUREMENT ACTION SECTION ───────────────────────────── */}
          {user ? (
            existingRequest ? (
              <div className="rounded-lg border border-[var(--terrion-green-200)] bg-[var(--terrion-green-50)]/40 p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={existingRequest.status === 'accepted' ? 'positive' : 'warning'}>
                        {requestStatusLabel(existingRequest.status)}
                      </Badge>
                      <span className="text-xs font-bold text-foreground">
                        {existingRequest.volumeKg / 1000} ton diajukan
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-prose">
                      Anda telah mengajukan kontrak pasokan untuk panen ini ke <strong className="text-foreground">{listing.cooperativeName}</strong>. Pantau status tanggapan pengurus melalui menu Permintaan Saya.
                    </p>
                  </div>
                  <Link
                    href="/my-requests"
                    className={cn(
                      buttonVariants({ size: 'sm' }),
                      'interactive gap-2 font-medium bg-[var(--terrion-green-700)] hover:bg-[var(--terrion-green-900)] text-white shadow-xs',
                    )}
                  >
                    Lihat Permintaan Saya
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card p-6 shadow-xs sm:p-7">
                <div className="border-b border-border/70 pb-4 mb-5">
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    Formulir Pengajuan Kontrak Pasokan
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Kirimkan permohonan alokasi tonase langsung ke pengurus koperasi tanpa perantara.
                  </p>
                </div>

                <RequestForm listingId={listing.id} projectedTonnes={listing.tonnes} />
              </div>
            )
          ) : (
            <div className="rounded-lg border border-border bg-card p-6 shadow-xs sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-md">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--terrion-green-100)] px-2.5 py-0.5 text-xs font-semibold text-[var(--terrion-green-700)] mb-2">
                    <Lock className="size-3" />
                    Akses Pembeli & Off-taker
                  </div>
                  <h2 className="text-base font-bold text-foreground">
                    Masuk untuk Mengajukan Kontrak Pasokan
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Daftar akun pembeli untuk memesan tonase panen langsung dari {listing.cooperativeName}. Tanpa biaya perantara dan berstatus hukum jelas.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                  <Link
                    href={`/login?next=${encodeURIComponent(`/catalog/${listing.id}`)}`}
                    className={cn(
                      buttonVariants({ size: 'sm' }),
                      'interactive gap-2 font-medium bg-[var(--terrion-green-700)] hover:bg-[var(--terrion-green-900)] text-white shadow-xs',
                    )}
                  >
                    Masuk Akun
                  </Link>
                  <Link
                    href="/signup"
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    Daftar Pembeli Baru
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}

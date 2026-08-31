import Link from 'next/link'
import { notFound } from 'next/navigation'

import { RequestForm } from '@/components/commerce/RequestForm'
import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { toISODate } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { listingSummary, requestStatusLabel } from '@/lib/catalog/copy'
import { parseListingId } from '@/lib/catalog/listings'
import { loadCooperativeListings } from '@/lib/catalog/load'
import { commodityStyle } from '@/lib/catalog/commodity-style'
import { formatNumberId } from '@/lib/format/number'
import { createServerClient } from '@/lib/supabase/server'

// No revalidate here, unlike the list page. This page calls currentAppUser(),
// which reads cookies, so it renders dynamically no matter what this export
// said -- and it must, because a buyer sees a form where a visitor sees a
// sign-in link. The expensive part is scoped to one cooperative rather than
// every cooperative, which is what makes that affordable.
export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // A malformed or stale id is a 404, never a throw.
  const parsed = parseListingId(id)
  if (!parsed) notFound()

  const listings = await loadCooperativeListings(parsed.cooperativeId)
  const listing = listings.find(l => l.id === id)
  if (!listing) notFound()

  const user = await currentAppUser()
  const style = commodityStyle(listing.commodityName)

  // A buyer with an open request against this exact listing sees its status
  // instead of the form -- otherwise the same button submits again on every
  // visit to this page, and the cooperative's inbox fills with duplicates of
  // a request it has not even answered yet.
  const existingRequest = user?.role === 'buyer'
    ? await (async () => {
        const db = await createServerClient()
        const { data } = await db.from('supply_contract_request')
          .select('status')
          .eq('buyer_id', user.id)
          .eq('cooperative_id', listing.cooperativeId)
          .eq('commodity_id', listing.commodityId)
          .eq('window_start', toISODate(listing.weekStart))
          .eq('window_end', toISODate(listing.weekEnd))
          .in('status', ['pending', 'accepted'])
          .maybeSingle()
        return data
      })()
    : null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* A breadcrumb, not a back arrow: it says where you are as well as where
          you came from, and it does not lie when the page was opened from a
          shared link rather than from the grid. */}
      <nav aria-label="Remah roti" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/catalog" className="interactive rounded px-1 hover:text-foreground">
          Katalog
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{listing.commodityName}</span>
      </nav>

      <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,13rem)_1fr] sm:items-start">
        {/* The crop's identity block, matching its card in the grid so the
            transition from list to detail is recognisably the same object. */}
        <div
          className="rise flex aspect-[4/3] items-center justify-center rounded-xl border border-border sm:aspect-square"
          style={{ backgroundColor: style.tint }}
        >
          <svg
            aria-hidden viewBox="0 0 24 24" className="size-20"
            fill="none" stroke={style.hue} strokeWidth="1.1"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d={style.glyph} />
          </svg>
        </div>

        <div className="rise flex flex-col gap-4" style={{ ['--rise-delay' as string]: '80ms' }}>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {listing.commodityName}
              {listing.varietyName && (
                <span className="font-normal text-muted-foreground"> · {listing.varietyName}</span>
              )}
            </h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M12 21s-7-5.4-7-10a7 7 0 1 1 14 0c0 4.6-7 10-7 10Z" strokeLinejoin="round" />
                <circle cx="12" cy="11" r="2.4" />
              </svg>
              {listing.cooperativeName} · {listing.village}, {listing.district}, {listing.province}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Proyeksi tersedia</p>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-medium tracking-tight" style={{ color: style.hue }}>
                  {formatNumberId(listing.tonnes)}
                </span>
                <span className="text-sm text-muted-foreground">ton</span>
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Jendela panen</p>
              <div className="mt-1.5">
                <HarvestWindow
                  week={{ start: listing.weekStart, end: listing.weekEnd, basis: listing.basis }}
                />
              </div>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {listingSummary({ tonnes: listing.tonnes, cooperativeName: listing.cooperativeName })}
          </p>
        </div>
      </div>

      {user?.role === 'buyer' ? (
        existingRequest ? (
          <div className="mt-6 rounded-lg border border-border bg-card p-4 text-sm">
            <p className="font-semibold text-foreground">
              {requestStatusLabel(existingRequest.status)}
            </p>
            <p className="mt-1 text-muted-foreground">
              Anda sudah mengajukan permintaan untuk panen ini.
            </p>
            <Link
              href="/my-requests"
              className="mt-2 inline-block font-medium text-foreground underline"
            >
              Lihat permintaan saya
            </Link>
          </div>
        ) : (
          <RequestForm
            listingId={listing.id}
            projectedTonnes={listing.tonnes}
            className="mt-6"
          />
        )
      ) : user ? (
        // Signed in, but on the cooperative side. Telling them to sign in would
        // be nonsense -- they already have; they are simply not a buyer.
        <div className="mt-6 rounded-lg border border-dashed border-border p-4 text-sm">
          <p className="text-muted-foreground">
            Anda masuk sebagai akun koperasi. Hanya akun pembeli yang dapat
            mengajukan kontrak pasokan.
          </p>
          <Link
            href="/dashboard"
            className="mt-2 inline-block font-medium text-foreground underline"
          >
            Ke dasbor koperasi
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-border p-4 text-sm">
          <p className="text-muted-foreground">
            Masuk sebagai pembeli untuk mengajukan kontrak pasokan.
          </p>
          {/* Both doors, because the catalogue is public so that strangers
              find it. Offering only "Masuk" ends the journey for everyone who
              does not already have an account. */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              href={`/login?next=${encodeURIComponent(`/catalog/${listing.id}`)}`}
              className="inline-block font-medium text-foreground underline"
            >
              Masuk
            </Link>
            <Link href="/signup" className="inline-block font-medium text-foreground underline">
              Daftar sebagai pembeli
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

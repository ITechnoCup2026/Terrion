import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { BuyerHome, BuyerHomeHeader } from '@/components/buyer/BuyerHome'
import { BuyerHomeSkeleton } from '@/components/buyer/BuyerHomeSkeleton'
import { Page } from '@/components/ui/Page'
import { loadAtlasCooperativesIfUp } from '@/lib/atlas/load'
import { currentAppUser } from '@/lib/auth/session'
import { loadCatalogListings } from '@/lib/catalog/load'
import { loadSupplyRequests, type SupplyRequest } from '@/lib/supply-requests/load'

export const metadata = { title: 'Beranda pembeli' }

// The page opens on the status of requests a cooperative can answer at any
// moment. A cached answer would greet a buyer with "menunggu jawaban" over a
// request that was accepted this morning.
export const dynamic = 'force-dynamic'

/**
 * Where a signed-in pembeli lands.
 *
 * Buyers had no such page: `homeFor('buyer')` pointed at the catalogue, so the
 * first thing a buyer saw after signing in was a grid of everyone else's
 * harvest, and "Beranda" in the header took them to the marketing landing page
 * — a brochure for a product they had already bought into.
 *
 * Four backend calls stand between a click and this screen. They used to run
 * as one round trip for the session and then three in parallel behind an
 * `await` that held the entire page — around a second and a half of blank
 * white on a Railway backend, and every one of those milliseconds spent
 * before a single pixel was allowed to paint. Now the three data calls are
 * started before the session is even asked about, so they overlap it, and the
 * body streams: the greeting and the two buttons render as soon as we know
 * who this is, with the skeleton beneath them replaced in place when the data
 * lands.
 */
export default async function BerandaPage() {
  // Started, not awaited. These are the same three calls for every signed-in
  // buyer, so there is nothing in the session that could change what is
  // asked; waiting for /api/me first only serialises two things that could
  // have been happening at once.
  const data = loadBeranda()
  // A visitor who turns out not to be a buyer is redirected below and never
  // awaits this, which would leave the rejection of a failed call unhandled.
  // The `.catch` marks it handled without swallowing it: the promise this
  // returns is thrown away, and `data` itself still rejects into the
  // Suspense boundary for anyone who does await it.
  data.catch(() => {})

  const user = await currentAppUser()
  if (!user) redirect('/login')
  // Cooperative staff have a dashboard of their own; this page would only ever
  // show them an empty list of requests they never made.
  if (user.role !== 'buyer') redirect('/dashboard')

  // max-w-7xl rather than the shell's default `wide`: the catalogue is
  // anchored there — it is the one buyer screen a signed-out stranger also
  // reads, under a header that is itself max-w-7xl — and a buyer moving
  // Beranda -> Katalog -> Permintaan must not watch the content column change
  // width at each step.
  return (
    <Page className="flex max-w-7xl flex-col gap-6">
      <BuyerHomeHeader
        greeting={greetingNow()}
        user={{ fullName: user.full_name, organisation: user.organisation }}
      />
      <Suspense fallback={<BuyerHomeSkeleton />}>
        <BerandaBody data={data} />
      </Suspense>
    </Page>
  )
}

async function BerandaBody({ data }: { data: Promise<BerandaData> }) {
  const { requests, catalog, cooperativeNames } = await data

  return (
    <BuyerHome
      requests={requests}
      listings={catalog.listings}
      commodities={catalog.commodities}
      provinces={catalog.provinces}
      cooperativeNames={cooperativeNames}
    />
  )
}

type BerandaData = {
  requests: SupplyRequest[]
  catalog: Awaited<ReturnType<typeof loadCatalogListings>>
  cooperativeNames: Map<string, string>
}

async function loadBeranda(): Promise<BerandaData> {
  const [requests, catalog, cooperatives] = await Promise.all([
    loadSupplyRequests(),
    loadCatalogListings(),
    loadAtlasCooperativesIfUp(),
  ])

  // A request stores a cooperative id and nothing else, so the name has to
  // come from the atlas roster. That roster is allowed to be missing — a map
  // that is down must not take the beranda with it — and a request then names
  // its cooperative as "Koperasi" rather than not rendering at all.
  const cooperativeNames = new Map(
    (cooperatives ?? []).map(c => [c.id, c.name] as const),
  )
  for (const listing of catalog.listings) {
    if (!cooperativeNames.has(listing.cooperativeId)) {
      cooperativeNames.set(listing.cooperativeId, listing.cooperativeName)
    }
  }

  return { requests, catalog, cooperativeNames }
}

/**
 * The time of day in Jakarta, not on the server. This app renders in a
 * container that could be anywhere, and "Selamat malam" at ten in the morning
 * is the kind of small wrongness that makes a page feel machine-written.
 */
function greetingNow(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    }).format(new Date()),
  )

  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

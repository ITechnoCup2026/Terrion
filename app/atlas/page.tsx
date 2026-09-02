import { Atlas } from '@/components/atlas/Atlas'
import { isBackendDown } from '@/lib/api/client'
import { loadAtlasCooperatives } from '@/lib/atlas/load'
import { homeFor } from '@/lib/auth/display'
import { currentAppUser, type AppUser } from '@/lib/auth/session'
import type { Listing } from '@/lib/catalog/listings'
import { loadCatalogListings } from '@/lib/catalog/load'

// It counts real cooperatives, so it cannot be baked at build time.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Atlas',
  description:
    'Peta pasokan panen koperasi tani se-Indonesia, dua belas minggu ke depan.',
}

export default async function AtlasPage() {
  let user: AppUser | null = null
  try {
    user = await currentAppUser()
  } catch (error) {
    if (!isBackendDown(error)) throw error
  }

  const cooperatives = await loadAtlasCooperatives()

  // The catalogue is what the map is shaded by, but it is an enhancement, not
  // the page: if it cannot be reached the Atlas still says where every
  // cooperative is. Letting this throw would take down a working map over a
  // missing colour.
  let listings: Listing[] = []
  try {
    listings = (await loadCatalogListings()).listings
  } catch (error) {
    if (!isBackendDown(error)) throw error
  }

  const homeHref = user ? homeFor(user.role) : '/'
  const homeLabel = user
    ? (user.role === 'buyer' ? 'Katalog' : 'Dashboard')
    : 'Beranda'

  return (
    // The page IS the map. All of its chrome lives in the panel the Atlas
    // renders, rather than floating over the map in five corners.
    <div className="h-dvh w-full overflow-hidden">
      <Atlas
        cooperatives={cooperatives}
        listings={listings}
        homeHref={homeHref}
        homeLabel={homeLabel}
        showCatalog={!user || user.role === 'buyer'}
      />
    </div>
  )
}

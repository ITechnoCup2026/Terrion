import Link from 'next/link'

import { Atlas } from '@/components/atlas/Atlas'
import { Logo } from '@/components/ui/Logo'
import { isBackendDown } from '@/lib/api/client'
import { loadAtlasCooperatives } from '@/lib/atlas/load'
import { homeFor } from '@/lib/auth/display'
import { currentAppUser, type AppUser } from '@/lib/auth/session'

// It counts real cooperatives, so it cannot be baked at build time.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Atlas',
  description: 'Peta sebaran koperasi tani yang memetakan lahannya di Terrion.',
}

export default async function AtlasPage() {
  let user: AppUser | null = null
  try {
    user = await currentAppUser()
  } catch (error) {
    if (!isBackendDown(error)) throw error
  }

  const cooperatives = await loadAtlasCooperatives()
  const homeTarget = user ? homeFor(user.role) : '/'
  
  let returnLabel = 'Kembali ke beranda'
  if (user) {
    returnLabel = user.role === 'buyer' ? 'Kembali ke Katalog' : 'Kembali ke Dasbor'
  }

  const showCatalog = !user || user.role === 'buyer'

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Atlas cooperatives={cooperatives} variant="full" />

      {/* Floating chrome, bottom-right */}
      <div className="absolute right-4 bottom-4 z-30 flex items-center gap-2">
        {user?.role === 'buyer' && (
          <Link
            href="/my-requests"
            className="interactive rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-white/70 backdrop-blur-md hover:bg-black/60 hover:text-white"
          >
            Permintaan Saya
          </Link>
        )}
        {showCatalog && (
          <Link
            href="/catalog"
            className="interactive rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-white/70 backdrop-blur-md hover:bg-black/60 hover:text-white"
          >
            Katalog
          </Link>
        )}
        <Link
          href={homeTarget}
          className="interactive rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-white/90 backdrop-blur-md hover:bg-black/60 hover:text-white"
        >
          {returnLabel}
        </Link>
      </div>

      {/* Top-centre logo link */}
      <Link
        href={homeTarget}
        className="interactive absolute top-4 left-1/2 z-30 hidden -translate-x-1/2 rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 backdrop-blur-md md:block [&_span]:text-white"
        aria-label={`Terrion, ${returnLabel.toLowerCase()}`}
      >
        <Logo />
      </Link>
    </div>
  )
}

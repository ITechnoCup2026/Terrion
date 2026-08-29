import Link from 'next/link'

import { Atlas } from '@/components/atlas/Atlas'
import { Logo } from '@/components/ui/Logo'
import { loadAtlasCooperatives } from '@/lib/atlas/load'

// It counts real cooperatives, so it cannot be baked at build time.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Atlas',
  description: 'Peta sebaran koperasi tani yang memetakan lahannya di Terrion.',
}

/**
 * The Atlas, given the whole screen.
 *
 * It used to be a section on the landing page: a map you could not drag, in a
 * box a third of the height of the window, under a headline. A map that small
 * cannot be explored, and a landing page is not the place to explore one --
 * so it is a page of its own now, and the landing page links to it.
 *
 * Deliberately NOT inside the (public) route group. That layout gives every
 * page a sticky header and a footer, and a map that fills the viewport cannot
 * live under a header without either scrolling or being cropped. The chrome
 * here floats over the map instead, the same decision the farm page made.
 *
 * Still public. No session is read here or in the loader.
 */
export default async function AtlasPage() {
  const cooperatives = await loadAtlasCooperatives()

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Atlas cooperatives={cooperatives} variant="full" />

      {/* Floating chrome, bottom-right: the map's own controls hold the top
          right, the breadcrumb the top left, and the legend the bottom left. */}
      <div className="absolute right-4 bottom-4 z-30 flex items-center gap-2">
        <Link
          href="/catalog"
          className="interactive rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-white/70 backdrop-blur-md hover:bg-black/60 hover:text-white"
        >
          Katalog
        </Link>
        <Link
          href="/"
          className="interactive rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-white/70 backdrop-blur-md hover:bg-black/60 hover:text-white"
        >
          Kembali ke beranda
        </Link>
      </div>

      {/* Top-centre: the map keeps its breadcrumb top-left and its camera
          controls top-right, so this is the one place left. Hidden on narrow
          screens, where those two already meet in the middle.

          The wordmark's ink is `text-foreground`, which is dark — correct
          everywhere else in the product and wrong on this near-black ground,
          so the plate overrides it. */}
      <Link
        href="/"
        className="interactive absolute top-4 left-1/2 z-30 hidden -translate-x-1/2 rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 backdrop-blur-md md:block [&_span]:text-white"
        aria-label="Terrion, kembali ke beranda"
      >
        <Logo />
      </Link>
    </div>
  )
}

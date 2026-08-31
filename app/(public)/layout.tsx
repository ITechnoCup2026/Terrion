import Link from 'next/link'

import { AuthMenu } from '@/components/auth/AuthMenu'
import { Logo } from '@/components/ui/Logo'

/**
 * The public shell: the Atlas and the supply catalogue.
 *
 * Deliberately thin: no cooperative identity, no app navigation, no session
 * awareness. This repo is frontend-only -- there is no backend to ask who is
 * signed in, so the header always renders the signed-out state.
 *
 * The header is sticky and translucent: on the catalogue the reader scrolls a
 * long list and still needs the way back, and a solid bar that far down the
 * page reads as a second, unrelated header.
 */
export default function PublicLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* h-[var(--public-header)] rather than padding: the landing hero sizes
          itself as calc(100dvh - var(--public-header)), so the header's real
          height and the number the hero subtracts have to be the same thing. */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-[var(--public-header)] w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" className="interactive group">
            <Logo className="transition-transform duration-300 group-hover:-translate-y-0.5" />
          </Link>

          {/* Katalog and Atlas are the two things to look at. What comes after
              depends on who is asking. */}
          <nav aria-label="Navigasi publik" className="flex items-center gap-1">
            <Link
              href="/catalog"
              className="interactive rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Katalog
            </Link>
            <Link
              href="/atlas"
              className="interactive rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Atlas
            </Link>

            <div className="ml-1">
              <AuthMenu />
            </div>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-4 py-6">
          <p className="text-xs text-muted-foreground">
            Terrion adalah penyedia sistem, bukan pihak dalam kontrak antara
            koperasi dan pembeli.
          </p>
        </div>
      </footer>
    </div>
  )
}

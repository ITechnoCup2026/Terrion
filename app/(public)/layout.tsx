import Link from 'next/link'

import { Logo } from '@/components/ui/Logo'

/**
 * The public shell: the Atlas and the supply catalogue.
 *
 * Deliberately thin. Nothing here may assume a signed-in user — these pages are
 * read by buyers and by anyone following a shared plot link, so the frame
 * carries no cooperative identity and no navigation into the app.
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

          {/* Katalog and Atlas are the two things to look at; Masuk and
              Daftar are the two things to do. The Atlas entry is new: it
              stopped being a section of the landing page and became a page,
              so it needs a way in from every public screen. */}
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
            <Link
              href="/login"
              className="interactive rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Masuk
            </Link>
            {/* "Daftar pembeli", not "Daftar". A bare Daftar reads as an
                invitation to register a cooperative, and there is no such
                form -- a koperasi is verified offline. Naming the audience is
                the difference between a door and a dead end. */}
            <Link
              href="/signup"
              className="interactive ml-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Daftar pembeli
            </Link>
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

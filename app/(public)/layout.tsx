import Link from 'next/link'

import { AccountMenu } from '@/components/auth/AccountMenu'
import { AuthMenu } from '@/components/auth/AuthMenu'
import { Logo } from '@/components/ui/Logo'
import { PublicNav } from '@/components/ui/PublicNav'
import { isBackendDown } from '@/lib/api/client'
import { homeFor } from '@/lib/auth/display'
import { currentAppUser, type AppUser } from '@/lib/auth/session'

/**
 * The public shell: the landing page, the supply catalogue and a shared garden.
 *
 * It IS session-aware, and has to be. The header used to render "Masuk"
 * unconditionally on the grounds that there was no backend to ask — a comment
 * that outlived the backend arriving. The result was that a buyer, whose whole
 * job happens on the public catalogue, was invited to sign in on every page
 * after they already had, and had nowhere to sign out from at all.
 *
 * The header is sticky and translucent: on the catalogue the reader scrolls a
 * long list and still needs the way back, and a solid bar that far down the
 * page reads as a second, unrelated header.
 */
export default async function PublicLayout({ children }: LayoutProps<'/'>) {
  // These pages are public by design, so an unreachable backend must not take
  // them down — a stranger reading the catalogue is not affected by our being
  // unable to look up who they are. "I could not ask" therefore renders the
  // signed-out header here, which is the one place in the app where collapsing
  // it with "nobody is signed in" costs the reader nothing: every link in both
  // states goes somewhere that says so itself.
  let user: AppUser | null = null
  try {
    user = await currentAppUser()
  } catch (error) {
    if (!isBackendDown(error)) throw error
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* h-[var(--public-header)] rather than padding: the landing hero sizes
          itself as calc(100dvh - var(--public-header)), so the header's real
          height and the number the hero subtracts have to be the same thing. */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-[var(--public-header)] w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Link href={user ? homeFor(user.role) : '/'} className="interactive group">
            <Logo className="transition-transform duration-300 group-hover:-translate-y-0.5" />
          </Link>

          {/* Katalog, Permintaan Saya, and Atlas navigation */}
          <div className="flex items-center gap-2">
            <PublicNav role={user?.role} />

            <div className="ml-2 border-l border-border pl-2">
              {user ? (
                <AccountMenu
                  fullName={user.full_name}
                  organisation={user.organisation}
                  role={user.role}
                />
              ) : (
                <AuthMenu />
              )}
            </div>
          </div>
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

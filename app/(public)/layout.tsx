import Link from 'next/link'

import { AccountMenu } from '@/components/auth/AccountMenu'
import { AuthMenu } from '@/components/auth/AuthMenu'
import { Logo } from '@/components/ui/Logo'
import { PublicHeader } from '@/components/ui/PublicHeader'
import { PublicNav } from '@/components/ui/PublicNav'
import { PublicShell } from '@/components/ui/PublicShell'
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
    <PublicShell>
      {/* Absent on the landing page, which carries its own bar inside the
          hero card. Everywhere else it is the sticky way back: the catalogue
          is a long list and a reader deep in it still needs the header. */}
      <PublicHeader>
        <Link href={user ? homeFor(user.role) : '/'} aria-label="Terrion">
          <Logo size={24} />
        </Link>

        <div className="flex items-center gap-3">
          <PublicNav role={user?.role} />

          <div>
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
      </PublicHeader>

      <main className="flex flex-1 flex-col">{children}</main>

      {/* The footer says two things and stops: where else you can go, and
          what Terrion is not. No newsletter, no second navigation of links
          that already exist in the header, no social row for accounts nobody
          keeps. */}
      <footer className="border-t border-border bg-muted">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo size={22} />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Terrion adalah penyedia sistem, bukan pihak dalam kontrak antara
              koperasi dan pembeli.
            </p>
          </div>

          <nav aria-label="Tautan kaki" className="flex flex-col gap-2.5">
            {(
              [
                ['/atlas', 'Atlas'],
                ['/catalog', 'Katalog pasokan'],
                ['/login', 'Masuk sebagai koperasi'],
              ] as const
            ).map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="interactive text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </PublicShell>
  )
}

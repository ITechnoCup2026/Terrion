import Link from 'next/link'

import { Logo } from '@/components/ui/Logo'
import { PublicHeader } from '@/components/ui/PublicHeader'
import { PublicShell } from '@/components/ui/PublicShell'
import { isBackendDown } from '@/lib/api/client'
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
      <PublicHeader
        user={
          user
            ? {
                fullName: user.full_name,
                organisation: user.organisation,
                role: user.role,
              }
            : null
        }
      />

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo size={24} withWordmark={true} />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Terrion adalah penyedia sistem, bukan pihak dalam kontrak antara
              koperasi dan pembeli.
            </p>
          </div>

          <nav aria-label="Tautan kaki" className="flex flex-col gap-2.5">
            {(
              [
                ['/atlas', 'Atlas Pasokan'],
                ['/catalog', 'Katalog Pasokan'],
                ['/login', 'Masuk Koperasi'],
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

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { AccountMenu } from '@/components/auth/AccountMenu'
import { AuthMenu } from '@/components/auth/AuthMenu'
import { AppShell } from '@/components/ui/AppShell'
import { Logo } from '@/components/ui/Logo'
import { PublicNav } from '@/components/ui/PublicNav'
import { homeFor } from '@/lib/auth/display'
import type { UserRole } from '@/lib/auth/roles'
import { isActivePath } from '@/lib/nav/active'

/**
 * Which frame a public route gets: the marketing header, or the workspace rail.
 *
 * These routes serve two people at once. `/catalog` is a shop window to a
 * stranger and a working screen to a signed-in buyer, and until now both got
 * the same three-link header — so a buyer with an account, a supplier
 * organisation and a list of live contract requests was navigating the product
 * through the same strip a first-time visitor sees. Meanwhile a kader got a
 * rail, groups, breadcrumbs and a command palette. Same product, two classes
 * of user interface.
 *
 * So a signed-in buyer standing on one of their own screens gets <AppShell>,
 * the same frame the cooperative side uses, populated from the nav data that
 * already described their three destinations. Everyone else keeps the public
 * header:
 *
 *   the landing page   is a brochure, and a brochure with a workspace rail
 *                      down its left is not a brochure
 *   a shared garden    arrives by WhatsApp, usually to somebody with no
 *                      account at all
 *   a stranger         anywhere has no workspace to put in a rail
 *
 * A client component because the choice needs the current path, which a server
 * layout cannot read. The session lookup stays on the server above it.
 */

/** Where a signed-in buyer is working rather than browsing. */
const BUYER_WORKSPACE = ['/catalog', '/my-requests']

export type FrameUser = {
  fullName: string
  organisation: string | null
  role: UserRole
}

export function PublicFrame({
  user,
  children,
}: {
  user: FrameUser | null
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const inWorkspace =
    user?.role === 'buyer' && BUYER_WORKSPACE.some(href => isActivePath(pathname, href))

  if (inWorkspace && user) {
    return (
      <AppShell
        workspace={user.organisation ? { name: user.organisation, detail: null } : null}
        userName={user.fullName}
        role={user.role}
      >
        {/* --public-header is how far down the page a sticky child has to
            start clearing the header. Under the public header that is the
            header's own height; inside the shell the top bar sits OUTSIDE the
            scroll container, so the offset is zero. Without this the
            catalogue's sticky filter bar parks 3.5rem below where it should,
            leaving a band of rows sliding under nothing. */}
        <div style={{ '--public-header': '0px' } as React.CSSProperties}>
          {children}
          {/* Inside the scrolling content rather than pinned under the rail:
              the shell has no footer slot, and this line has to survive the
              move — it is the product saying what it is not a party to. */}
          <Disclaimer className="border-t border-border" />
        </div>
      </AppShell>
    )
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* h-[var(--public-header)] rather than padding: the landing hero sizes
          itself as calc(100dvh - var(--public-header)), so the header's real
          height and the number the hero subtracts have to be the same thing. */}
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex h-[var(--public-header)] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-1 items-center justify-start min-w-0">
            <Link href={user ? homeFor(user.role) : '/'} aria-label="Terrion" className="interactive flex items-center gap-2">
              <Logo size={26} withWordmark={true} />
            </Link>
          </div>

          <div className="flex items-center justify-center">
            <PublicNav role={user?.role} />
          </div>

          <div className="flex flex-1 items-center justify-end">
            {user ? (
              <AccountMenu
                fullName={user.fullName}
                organisation={user.organisation}
                role={user.role}
              />
            ) : (
              <AuthMenu />
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <Disclaimer className="border-t border-border" />
    </div>
  )
}

function Disclaimer({ className }: { className?: string }) {
  return (
    <footer className={className}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-xs text-muted-foreground">
          Terrion adalah penyedia sistem, bukan pihak dalam kontrak antara koperasi dan pembeli.
        </p>
      </div>
    </footer>
  )
}

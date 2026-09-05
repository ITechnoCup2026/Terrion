'use client'

import { usePathname } from 'next/navigation'

import { AppShell } from '@/components/ui/AppShell'
import type { UserRole } from '@/lib/auth/roles'
import { wearsWorkspaceFrame } from '@/lib/nav/workspace'

/**
 * The public shell's outermost box — and the fork between the two frames a
 * public route can wear.
 *
 * These routes serve two people at once. `/catalog` is a shop window to a
 * stranger and a working screen to a signed-in buyer, and both used to get the
 * same three-link marketing strip — so a buyer with an account, an
 * organisation and a list of live contract requests navigated the product
 * through the header a first-time visitor sees, while a kader got a rail,
 * groups, breadcrumbs and a command palette. Same product, two classes of
 * user interface.
 *
 * So a signed-in pembeli standing on one of their own screens gets <AppShell>,
 * the same frame the cooperative side uses, populated from the nav data that
 * already described their destinations. Everyone else keeps the public header:
 *
 *   the landing page   is a brochure, and a brochure with a workspace rail
 *                      down its left is not a brochure
 *   a shared garden    arrives by WhatsApp, usually to somebody with no
 *                      account at all
 *   a stranger         anywhere has no workspace to put in a rail
 *
 * The `.landing` theme goes on the element that contains the footer as well as
 * the page, because the footer is not the page's to colour: it lives in the
 * layout and is shared with the catalogue and the garden. `.landing`
 * redefines the design tokens rather than restyling anything, which is what
 * lets the supply ruler — a component the landing page does not own — sit
 * correctly on this surface without knowing the landing page exists.
 *
 * A client component purely to read the path, which a server layout cannot.
 * `header`, `footer` and `children` are composed on the server and passed
 * through untouched, so nothing about the shell's contents ships to the
 * browser because of this.
 */

export type ShellUser = {
  fullName: string
  organisation: string | null
  role: UserRole
}

export function PublicShell({
  user,
  header,
  footer,
  children,
}: {
  user: ShellUser | null
  /** The marketing header. Unused inside the workspace frame, which has its own. */
  header: React.ReactNode
  /** The site footer. Unused inside the workspace frame, which keeps only the disclaimer. */
  footer: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const landing = pathname === '/'

  const inWorkspace = wearsWorkspaceFrame(pathname, user?.role ?? null)

  if (user && inWorkspace) {
    return (
      <AppShell
        // The buyer first, the company they buy for underneath. The rail used
        // to carry the company alone — a column that named an employer and
        // never the account holder, and that stood empty for a buyer who
        // signed up without a company at all.
        workspace={{ name: user.fullName, detail: user.organisation, kind: 'person' }}
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
              move — it is the product saying what it is not a party to. The
              rest of the site footer does not come along; a workspace does not
              need a link to the page you are standing on. */}
          <Disclaimer />
        </div>
      </AppShell>
    )
  }

  return (
    <div
      className={
        landing
          ? 'landing flex min-h-full flex-1 flex-col'
          : 'flex min-h-full flex-1 flex-col'
      }
    >
      {/* `.reveal` rests at opacity 0 and is turned on by an observer, and the
          map's provinces rest unfilled until that same observer reaches them.
          Everything is server-rendered, so this is the only thing standing
          between a reader without JavaScript and the page. */}
      {landing && (
        <noscript>
          <style>{
            '.reveal{opacity:1!important;transform:none!important}' +
            '.province-lit{fill-opacity:var(--lit-fill,0.3)!important}'
          }</style>
        </noscript>
      )}

      {header}

      <main className="flex flex-1 flex-col">{children}</main>

      {footer}
    </div>
  )
}

/** What the site footer reduces to inside the workspace frame. */
function Disclaimer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Terrion adalah penyedia sistem, bukan pihak dalam kontrak antara
          koperasi dan pembeli.
        </p>
      </div>
    </footer>
  )
}

'use client'

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { AppNav } from '@/components/ui/AppNav'
import { Logo } from '@/components/ui/Logo'
import { isImmersiveRoute } from '@/lib/nav/immersive'

/**
 * The cooperative-side frame.
 *
 * Two shapes, chosen by route:
 *
 *   document   the ordinary pages. Header, sidebar, content. The shell is
 *              exactly the viewport and the CONTENT scrolls, not the page --
 *              which is what removes the outer scrollbar that used to sit
 *              beside every screen.
 *
 *   immersive  the farm. The canvas gets the entire viewport and the chrome
 *              floats over it as detached cards. The plot page used to ask for
 *              h-[calc(100dvh-3.5rem)] from inside a padded <main> under a
 *              sticky header, so it was a letterboxed box in a scrolling page
 *              -- the farm rendered 512x448 in the middle of an empty screen.
 *
 * A client component because the choice needs the current path. The server
 * layout above it still does the auth check and the cooperative lookup, and
 * passes the results down: none of this is a security boundary, RLS is.
 *
 * Padding is deliberately NOT applied here. Every page owns its own, because a
 * layout that pads its children cannot have a child that fills the screen --
 * which is the bug this component exists to fix.
 */
export type ShellCooperative = { name: string; village: string; district: string } | null

export function AppShell({
  cooperative, userName, initials, signOutButton, children,
}: {
  cooperative: ShellCooperative
  userName: string
  initials: string
  /** The sign-out form, built on the server so its Server Action stays there. */
  signOutButton: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const immersive = isImmersiveRoute(pathname)
  const [navOpen, setNavOpen] = useState(false)

  const identity = (
    <div className="flex items-center gap-2.5">
      <Logo size={32} withWordmark={false} />
      <div className="leading-tight">
        <p className="text-sm font-semibold text-foreground">
          {cooperative?.name ?? 'Koperasi'}
        </p>
        {cooperative && (
          <p className="text-xs text-muted-foreground">
            {cooperative.village}, {cooperative.district}
          </p>
        )}
      </div>
    </div>
  )

  const account = (
    <div className="flex items-center gap-2.5">
      {/* Initials rather than a photo: nothing in the schema stores one, and a
          generic avatar glyph says less than two letters do. */}
      <span
        aria-hidden
        className="flex size-7 items-center justify-center rounded-full bg-secondary text-[0.7rem] font-semibold text-secondary-foreground"
      >
        {initials}
      </span>
      <p className="hidden text-xs text-muted-foreground sm:block">{userName}</p>
      {signOutButton}
    </div>
  )

  if (immersive) {
    return (
      // fixed, not h-dvh: this has to escape any scroll container above it and
      // sit exactly on the viewport, with nothing able to add a scrollbar.
      <div className="fixed inset-0 overflow-hidden">
        {children}

        {/* Chrome floats. pointer-events-none on the rail so the canvas can be
            dragged everywhere the cards themselves are not. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-3">
          <div className="pointer-events-auto flex items-start gap-2">
            <div className="rounded-xl border border-border bg-background/85 px-3 py-2 shadow-[var(--shadow-lg)] backdrop-blur-md">
              {identity}
            </div>

            <button
              type="button"
              onClick={() => setNavOpen(o => !o)}
              aria-expanded={navOpen}
              aria-label={navOpen ? 'Sembunyikan navigasi' : 'Tampilkan navigasi'}
              className="interactive flex size-9 items-center justify-center rounded-xl border border-border bg-background/85 text-muted-foreground shadow-[var(--shadow-lg)] backdrop-blur-md hover:text-foreground"
            >
              {navOpen
                ? <PanelLeftClose aria-hidden className="size-4" />
                : <PanelLeftOpen aria-hidden className="size-4" />}
            </button>
          </div>

          <div className="pointer-events-auto rounded-xl border border-border bg-background/85 px-3 py-2 shadow-[var(--shadow-lg)] backdrop-blur-md">
            {account}
          </div>
        </div>

        {/* Collapsed by default. The farm is the reason this page exists, and a
            permanent rail down its left is a column of it nobody asked for. */}
        {navOpen && (
          <div className="absolute top-16 left-3 z-40 w-44">
            <AppNav variant="floating" />
          </div>
        )}
      </div>
    )
  }

  return (
    // h-dvh with the scroll inside: the page itself never scrolls, so there is
    // no outer scrollbar and a child asking for full height gets it.
    // print:h-auto, because the RDKK form is several pages tall on paper.
    <div className="flex h-dvh flex-col overflow-hidden print:h-auto print:overflow-visible">
      <header className="z-40 shrink-0 border-b border-border bg-background/85 backdrop-blur-md print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
          {identity}
          {account}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row print:block print:min-h-0">
        <AppNav />
        <main className="min-h-0 flex-1 overflow-y-auto print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  )
}

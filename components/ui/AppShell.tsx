'use client'

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { AccountMenu } from '@/components/auth/AccountMenu'
import { CommandPalette, useCommandShortcut } from '@/components/ui/CommandPalette'
import { Logo } from '@/components/ui/Logo'
import { MobileNav } from '@/components/ui/MobileNav'
import { Sidebar } from '@/components/ui/Sidebar'
import { Topbar } from '@/components/ui/Topbar'
import type { UserRole } from '@/lib/auth/roles'
import { roleLabel } from '@/lib/auth/display'
import { isActivePath } from '@/lib/nav/active'
import { isImmersiveRoute } from '@/lib/nav/immersive'
import { navGroupsFor } from '@/lib/nav/items'
import { cn } from '@/lib/utils'

/**
 * The cooperative-side frame.
 *
 * Two shapes, chosen by route:
 *
 *   document   the ordinary pages. Rail, top bar, content. The shell is
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

/** Where the rail's width is remembered between visits. */
const COLLAPSE_KEY = 'terrion:nav-collapsed'

export function AppShell({
  cooperative, userName, role, children,
}: {
  cooperative: ShellCooperative
  userName: string
  role: UserRole
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const immersive = isImmersiveRoute(pathname)
  const groups = navGroupsFor(role)

  const [navOpen, setNavOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Starts expanded on both server and client, then adopts the stored
  // preference after mount. Reading localStorage during render would make the
  // first client paint disagree with the server's HTML, which React reports as
  // a hydration error and repairs by throwing the markup away.
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1')
    } catch {
      // Private mode, or storage disabled by policy. An expanded rail is a
      // perfectly good answer; losing the preference is not worth a crash.
    }
  }, [])

  function toggleCollapsed() {
    setCollapsed(current => {
      const next = !current
      try { window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* see above */ }
      return next
    })
  }

  const openSearch = useCallback(() => setSearchOpen(true), [])
  useCommandShortcut(openSearch)

  // The workspace block. No badge chip: gold in this product means "over a
  // limit", and a cooperative's own initials are not a warning. Collapsed, the
  // mark alone is the identity; expanded, the name is, and it is set as plain
  // text because a name in a tinted card reads as a status.
  const workspace = collapsed ? (
    <div className="flex justify-center" title={cooperative?.name ?? 'Koperasi'}>
      <Logo size={24} withWordmark={false} />
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Logo size={22} withWordmark={false} />
        <span className="text-[0.9375rem] font-semibold tracking-tight text-foreground">
          Terrion
        </span>
      </div>
      <div className="min-w-0 border-t border-border px-1 pt-2.5 leading-tight">
        <p className="truncate text-[0.8125rem] font-medium text-foreground">
          {cooperative?.name ?? 'Koperasi'}
        </p>
        {cooperative && (
          <p className="mt-0.5 truncate text-[0.6875rem] text-[var(--terrion-ink-faint)]">
            {cooperative.village}, {cooperative.district}
          </p>
        )}
      </div>
    </div>
  )

  // One account control, in one place, on both sides of the product. It used
  // to be three: a row in the rail's foot, a stacked pair in the collapsed
  // rail, and a bare glyph in the phone's top bar -- three arrangements of the
  // same two facts, none of which matched what a buyer sees.
  const account = (
    <AccountMenu
      fullName={userName}
      organisation={cooperative?.name ?? null}
      role={role}
      signOutTo="/login"
    />
  )

  // The same control over the farm canvas, lifted so it reads against a field.
  const floatingAccount = (
    <AccountMenu
      fullName={userName}
      organisation={cooperative?.name ?? null}
      role={role}
      signOutTo="/login"
      triggerClassName="shadow-[var(--shadow-md)]"
    />
  )

  const palette = (
    <CommandPalette groups={groups} open={searchOpen} onOpenChange={setSearchOpen} />
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
            <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-[var(--shadow-md)]">
              {workspace}
            </div>

            <button
              type="button"
              onClick={() => setNavOpen(o => !o)}
              aria-expanded={navOpen}
              aria-label={navOpen ? 'Sembunyikan navigasi' : 'Tampilkan navigasi'}
              className="interactive flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-[var(--shadow-md)] hover:text-foreground"
            >
              {navOpen
                ? <PanelLeftClose aria-hidden className="size-4" />
                : <PanelLeftOpen aria-hidden className="size-4" />}
            </button>
          </div>

          <div className="pointer-events-auto">{floatingAccount}</div>
        </div>

        {/* Collapsed by default. The farm is the reason this page exists, and a
            permanent rail down its left is a column of it nobody asked for. */}
        {navOpen && <FloatingNav groups={groups} pathname={pathname} />}

        {palette}
      </div>
    )
  }

  return (
    // h-dvh with the scroll inside: the page itself never scrolls, so there is
    // no outer scrollbar and a child asking for full height gets it.
    // print:h-auto, because the RDKK form is several pages tall on paper.
    <div className="flex h-dvh overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar groups={groups} collapsed={collapsed} header={workspace} />

      <div className="flex min-w-0 flex-1 flex-col print:block">
        <Topbar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onOpenSearch={openSearch}
          account={account}
        />

        <main className="min-h-0 flex-1 overflow-y-auto print:overflow-visible">
          {children}
        </main>

        <MobileNav groups={groups} />
      </div>

      {palette}
    </div>
  )
}

/**
 * The rail over the farm canvas: glyphs only, as a detached card. It is not
 * <Sidebar> because that one is a column with a border and a full-height
 * scroller, and over a picture both of those are wrong.
 */
function FloatingNav({
  groups, pathname,
}: {
  groups: ReturnType<typeof navGroupsFor>
  pathname: string
}) {
  return (
    <nav
      aria-label="Navigasi utama"
      className="absolute top-16 left-3 z-40 flex flex-col gap-px rounded-lg border border-border bg-card p-1.5 shadow-[var(--shadow-md)]"
    >
      {groups.flatMap((group, groupIndex) => [
        groupIndex > 0 && (
          <div key={`${group.label}-rule`} aria-hidden className="mx-1 my-0.5 h-px bg-border" />
        ),
        ...group.items.map(item => {
          const active = isActivePath(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'interactive flex size-9 items-center justify-center rounded-md',
                active
                  ? 'bg-secondary text-primary'
                  : 'text-[var(--terrion-ink-faint)] hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon aria-hidden className="size-4" />
            </Link>
          )
        }),
      ])}
    </nav>
  )
}

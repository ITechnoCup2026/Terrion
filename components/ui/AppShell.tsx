'use client'

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

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
  cooperative, userName, role, initials, signOutButton, children,
}: {
  cooperative: ShellCooperative
  userName: string
  role: UserRole
  initials: string
  /** The sign-out form, built on the server so its Server Action stays there. */
  signOutButton: React.ReactNode
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

  const coopShort = cooperative ? cooperative.name.slice(0, 2).toUpperCase() : 'KOP'

  const workspace = collapsed ? (
    <div className="flex justify-center py-1" title={cooperative?.name ?? 'Koperasi'}>
      <span className="tenant-badge font-black text-xs size-8 flex items-center justify-center rounded-lg bg-[var(--terrion-gold-500)] text-[var(--terrion-green-900)]">
        {coopShort}
      </span>
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 px-2 pt-1">
        <Logo size={28} withWordmark={false} />
        <span className="font-extrabold text-lg tracking-tight text-white">Terrion</span>
      </div>
      <div className="sb-tenant-card">
        <span className="tenant-badge">
          {coopShort}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-xs font-bold text-white">
            {cooperative?.name ?? 'Koperasi'}
          </p>
          {cooperative && (
            <p className="truncate text-[0.65rem] text-white/60 mt-0.5">
              {cooperative.village}, {cooperative.district}
            </p>
          )}
        </div>
      </div>
    </div>
  )

  const avatar = (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--terrion-gold-500)] text-[0.75rem] font-black text-[var(--terrion-green-900)] shadow-xs"
    >
      {initials}
    </span>
  )

  const railAccount = collapsed ? (
    <div className="flex flex-col items-center gap-2" title={userName}>
      {avatar}
      {signOutButton}
    </div>
  ) : (
    <div className="flex items-center gap-2.5 px-1 py-1">
      {avatar}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-xs font-bold text-white">{userName}</p>
        <p className="truncate text-[0.68rem] text-white/60 capitalize">{roleLabel(role)}</p>
      </div>
      {signOutButton}
    </div>
  )

  // Phone: no rail, so the top bar carries it. Same element tree, rendered a
  // second time -- a React element is a description, not an instance.
  const barAccount = (
    <div className="flex items-center gap-2 md:hidden">
      {avatar}
      {signOutButton}
    </div>
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
            <div className="rounded-xl border border-border bg-background/85 px-3 py-2 shadow-[var(--shadow-lg)] backdrop-blur-md">
              {workspace}
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

          <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-border bg-background/85 px-3 py-2 shadow-[var(--shadow-lg)] backdrop-blur-md">
            {avatar}
            <p className="hidden text-xs text-muted-foreground sm:block">{userName}</p>
            {signOutButton}
          </div>
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
      <Sidebar groups={groups} collapsed={collapsed} header={workspace} footer={railAccount} />

      <div className="flex min-w-0 flex-1 flex-col print:block">
        <Topbar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onOpenSearch={openSearch}
          account={barAccount}
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
      className="absolute top-16 left-3 z-40 flex flex-col gap-1 rounded-xl border border-border bg-background/85 p-1.5 shadow-[var(--shadow-lg)] backdrop-blur-md"
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
                'interactive flex size-9 items-center justify-center rounded-lg',
                active
                  ? 'bg-secondary text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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

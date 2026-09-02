'use client'

import { ChevronRight, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { breadcrumbsFor } from '@/lib/nav/breadcrumbs'
import { cn } from '@/lib/utils'

/**
 * The bar across the top of every document page.
 *
 * It carries the two things the old header did not: where you are, and a way
 * to get somewhere else without using the mouse. The cooperative's identity
 * moved out of here and into the rail, where a workspace belongs -- a header
 * that repeats the workspace name on every screen spends its width saying
 * something that never changes.
 *
 * Slim on purpose. This sits above a table on a 768 px-tall laptop screen, and
 * every pixel it takes is a row the reader does not get.
 */
export function Topbar({
  collapsed,
  onToggleCollapse,
  onOpenSearch,
  account,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
  onOpenSearch: () => void
  account: React.ReactNode
}) {
  const pathname = usePathname()
  const crumbs = breadcrumbsFor(pathname)

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-3 sm:px-4 print:hidden">
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Lebarkan navigasi' : 'Ciutkan navigasi'}
        className="interactive hidden size-8 shrink-0 items-center justify-center rounded-md text-[var(--terrion-ink-faint)] hover:bg-muted hover:text-foreground md:flex"
      >
        {collapsed
          ? <PanelLeftOpen aria-hidden className="size-4" />
          : <PanelLeftClose aria-hidden className="size-4" />}
      </button>

      <Breadcrumbs crumbs={crumbs} />

      <div className="ml-auto flex shrink-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenSearch}
          className="interactive flex h-8 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-[var(--terrion-ink-faint)] hover:border-input hover:bg-muted hover:text-foreground sm:w-56"
          aria-label="Cari halaman"
        >
          <Search aria-hidden className="size-4 shrink-0" />
          <span className="hidden text-xs sm:block">Cari halaman…</span>
          {/* A key cap, not a data label — the one place mono is about a
              literal keystroke rather than a figure in a column. */}
          <kbd className="ml-auto hidden rounded border border-border px-1 py-0.5 font-mono text-[0.625rem] sm:block">
            Ctrl K
          </kbd>
        </button>

        {account}
      </div>
    </header>
  )
}

function Breadcrumbs({ crumbs }: { crumbs: ReturnType<typeof breadcrumbsFor> }) {
  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Remah roti" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && (
                <ChevronRight aria-hidden className="size-3.5 shrink-0 text-border" />
              )}
              {/* The group name is a label, not a place: there is no page for
                  "Perdagangan", so it is never a link and it is the first
                  thing to go when the bar runs out of room. */}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="interactive truncate text-[var(--terrion-ink-faint)] hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'truncate',
                    last ? 'font-medium text-foreground' : 'hidden text-[var(--terrion-ink-faint)] sm:inline',
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

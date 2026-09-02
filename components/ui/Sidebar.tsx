'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isActivePath } from '@/lib/nav/active'
import type { NavGroup } from '@/lib/nav/items'
import { cn } from '@/lib/utils'

/**
 * The cooperative-side rail.
 *
 * Two states, and the collapsed one is the point. An ERP is used all day on a
 * laptop next to a spreadsheet, so the rail has to be able to get out of the
 * way without the reader losing where they are -- collapsed it keeps the
 * glyphs, the active marker and the group rules, and gives the labels back on
 * hover. Expanded it names its groups, which is the thing a flat list of six
 * links cannot do: "Operasi" is what you watch, "Perdagangan" is what you
 * commit to, "Publik" is somebody else's screen.
 *
 * Desktop only. Below `md` the rail would be most of the screen, so
 * <MobileNav> takes over with a bottom bar instead.
 */
export function Sidebar({
  groups,
  collapsed,
  header,
  footer,
}: {
  groups: readonly NavGroup[]
  collapsed: boolean
  /** The cooperative identity block, which the shell owns. */
  header: React.ReactNode
  footer: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigasi utama"
      data-collapsed={collapsed || undefined}
      className={cn(
        'hidden shrink-0 flex-col sidebar-wiradana md:flex print:hidden shadow-lg border-r border-emerald-950/40',
        'transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        collapsed ? 'w-[3.75rem]' : 'w-60',
      )}
    >
      <div className={cn('shrink-0 border-b border-white/10', collapsed ? 'p-2' : 'p-3')}>
        {header}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2 px-1">
        {groups.map((group, index) => (
          <div key={group.label} className={cn(index > 0 && 'mt-1')}>
            {collapsed ? (
              index > 0 && <div aria-hidden className="mx-3 my-2 h-px bg-white/10" />
            ) : (
              <p className="sb-section-label">
                {group.label}
              </p>
            )}

            <ul className="flex flex-col gap-1 px-1">
              {group.items.map(item => {
                const active = isActivePath(pathname, item.href)
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'sb-nav-item group/nav relative flex items-center rounded-xl text-sm font-medium transition-all duration-150',
                        collapsed ? 'h-10 w-full justify-center px-0' : 'h-10 gap-3 px-3',
                        active && 'active',
                      )}
                    >
                      <Icon
                        aria-hidden
                        className={cn(
                          'nav-icon size-4 shrink-0 transition-transform duration-200 group-hover/nav:scale-110',
                          active ? 'text-[var(--terrion-gold-500)] font-bold' : 'text-white/70 group-hover/nav:text-white',
                        )}
                      />
                      {!collapsed && <span className="truncate flex-1">{item.label}</span>}

                      {collapsed && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground opacity-0 shadow-[var(--shadow-lg)] transition-opacity duration-150 group-hover/nav:block group-hover/nav:opacity-100"
                        >
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className={cn('shrink-0 border-t border-white/10 bg-black/10', collapsed ? 'p-2' : 'p-2')}>
        {footer}
      </div>
    </nav>
  )
}

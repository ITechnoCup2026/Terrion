'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isActivePath } from '@/lib/nav/active'
import type { NavGroup } from '@/lib/nav/items'
import { cn } from '@/lib/utils'

/**
 * The cooperative-side rail.
 *
 * White, like the sheet beside it. It was a dark green gradient column with
 * gold chips, which is a second design fighting the first: a pengurus reading
 * a table of tonnages does not need a saturated band down the left of it, and
 * the rail was the brightest thing on a screen whose actual subject is a
 * figure. Chrome that competes with content is chrome that has to be read
 * before the content can be.
 *
 * Two states, and the collapsed one is the point. An ERP is used all day on a
 * laptop next to a spreadsheet, so the rail has to be able to get out of the
 * way without the reader losing where they are -- collapsed it keeps the
 * glyphs, the active fill and the group rules, and gives the labels back on
 * hover. Expanded it names its groups, which is the thing a flat list of six
 * links cannot do: "Operasi" is what you watch, "Perdagangan" is what you
 * commit to, "Publik" is somebody else's screen.
 *
 * Group labels are sentence case at 11px, not tracked-out capitals. A rail
 * that types its section names in all caps is spending emphasis on the one
 * part of the screen that never changes.
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
  /** Optional: the account control lives in the top bar, not down here. */
  footer?: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigasi utama"
      data-collapsed={collapsed || undefined}
      className={cn(
        'hidden shrink-0 flex-col border-r border-border bg-sidebar md:flex print:hidden',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-14' : 'w-60',
      )}
    >
      <div className={cn('shrink-0', collapsed ? 'px-2 py-3' : 'px-3 py-3')}>
        {header}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
        {groups.map((group, index) => (
          <div key={group.label} className={cn(index > 0 && (collapsed ? 'mt-2' : 'mt-5'))}>
            {collapsed ? (
              index > 0 && <div aria-hidden className="mx-2 mb-2 h-px bg-border" />
            ) : (
              <p className="px-2 pb-1.5 text-[0.6875rem] font-medium text-[var(--terrion-ink-faint)]">
                {group.label}
              </p>
            )}

            <ul className="flex flex-col gap-px">
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
                        'interactive group/nav relative flex items-center rounded-md text-[0.8125rem]',
                        collapsed ? 'h-9 w-full justify-center px-0' : 'h-9 gap-2.5 px-2',
                        // One signal for the current page, not two. The fill
                        // and the ink together are already unmistakable; a
                        // marker bar on top of them is a third thing to read.
                        active
                          ? 'bg-secondary font-medium text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon
                        aria-hidden
                        className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-[var(--terrion-ink-faint)]')}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}

                      {collapsed && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-[var(--shadow-md)] group-hover/nav:block"
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

      {footer && (
        <div className="shrink-0 border-t border-border p-2">{footer}</div>
      )}
    </nav>
  )
}

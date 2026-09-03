'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isActivePath } from '@/lib/nav/active'
import type { NavGroup } from '@/lib/nav/items'
import { cn } from '@/lib/utils'

/**
 * The cooperative-side rail.
 *
 * White, like the sheet beside it. ERP navigation designed for clear visibility
 * and minimal chrome distraction, with clear visual indicator for active route.
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
        'hidden shrink-0 flex-col border-r border-border bg-sidebar md:flex print:hidden select-none',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-14' : 'w-60',
      )}
    >
      <div className={cn('shrink-0', collapsed ? 'px-2 py-3' : 'px-3 py-3')}>
        {header}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-3">
        {groups.map((group, index) => (
          <div key={group.label} className={cn(index > 0 && (collapsed ? 'mt-3' : 'mt-5'))}>
            {collapsed ? (
              index > 0 && <div aria-hidden className="mx-2 mb-2 h-px bg-border/60" />
            ) : (
              groups.length > 1 && (
                <p className="px-2.5 pb-1.5 text-[0.65rem] font-bold tracking-wider text-muted-foreground/70 uppercase">
                  {group.label}
                </p>
              )
            )}

            <ul className="flex flex-col gap-1">
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
                        'interactive group/nav relative flex items-center rounded-lg text-xs font-semibold sm:text-[0.8125rem] transition-all duration-150',
                        collapsed ? 'h-9.5 w-full justify-center px-0' : 'h-9.5 gap-2.5 px-3',
                        active
                          ? 'bg-[var(--terrion-green-50)] text-[var(--terrion-green-900)] font-bold border border-[var(--terrion-green-200)]/70 shadow-2xs'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                      )}
                    >
                      <Icon
                        aria-hidden
                        className={cn(
                          'size-4 shrink-0 transition-colors',
                          active ? 'text-[var(--terrion-green-700)]' : 'text-muted-foreground/80 group-hover/nav:text-foreground'
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}

                      {collapsed && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md group-hover/nav:block"
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
        <div className="shrink-0 border-t border-border p-2.5">{footer}</div>
      )}
    </nav>
  )
}

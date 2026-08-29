'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isActivePath } from '@/lib/nav/active'
import { cn } from '@/lib/utils'

/**
 * The cooperative-side navigation.
 *
 * Client-side only because it needs the current path to mark the active item.
 * It renders as a sidebar from `md` up and as a horizontal scrolling bar below
 * that — a kader on a 360 px phone is the primary reader, so the narrow layout
 * is the one that has to work, not the one that degrades.
 */

// Paths carry their own glyph: on a 360 px phone the labels scroll out of
// sight, and a shape is what a kader actually navigates by.
const ITEMS = [
  { href: '/plots', label: 'Lahan', d: 'M3 20h18M5 20V9l7-5 7 5v11M9 20v-5h6v5' },
  { href: '/dashboard', label: 'Dasbor', d: 'M4 19V10M10 19V5M16 19v-6M22 19H2' },
  { href: '/purchases', label: 'Pembelian', d: 'M4 6h16l-1.5 9.5a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 6ZM9 20h.01M16 20h.01M3 3h1.5' },
  { href: '/requests', label: 'Permintaan', d: 'M4 5h16v11H8l-4 4V5Z' },
] as const

/**
 * `shell` is the ordinary sidebar. `floating` is the same items as a detached
 * card that sits on top of the farm canvas -- the plot page gives the whole
 * screen to the picture, so the navigation has to stop taking a column of it
 * and start hovering over it instead.
 */
export type NavVariant = 'shell' | 'floating'

const SHELL_CLASS =
  'sticky top-[3.5rem] z-30 flex gap-1 overflow-x-auto border-b border-border ' +
  'bg-background/85 p-2 backdrop-blur-md md:top-0 md:h-full md:w-48 md:shrink-0 ' +
  'md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3 ' +
  'md:backdrop-blur-none print:hidden'

const FLOATING_CLASS =
  'flex gap-1 overflow-x-auto rounded-xl border border-border bg-background/85 p-1.5 ' +
  'shadow-[var(--shadow-lg)] backdrop-blur-md md:flex-col md:overflow-visible print:hidden'

export function AppNav({ variant = 'shell' }: { variant?: NavVariant } = {}) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigasi utama"
      className={variant === 'floating' ? FLOATING_CLASS : SHELL_CLASS}
    >
      {ITEMS.map(item => {
        const active = isActivePath(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'interactive group relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium md:w-full',
              active
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {/* The active marker is a bar, not just a fill: colour alone is not
                a state indicator, and this one survives greyscale. */}
            <span
              aria-hidden
              className={cn(
                'absolute rounded-full bg-primary transition-all duration-300',
                'inset-x-3 bottom-0 h-0.5 md:inset-x-auto md:inset-y-2 md:left-0 md:h-auto md:w-0.5',
                active ? 'opacity-100' : 'opacity-0',
              )}
            />
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className={cn(
                'size-4 shrink-0 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={item.d} />
            </svg>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

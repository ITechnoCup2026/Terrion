'use client'

import { Dialog } from '@base-ui/react/dialog'
import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { isActivePath } from '@/lib/nav/active'
import type { NavGroup, NavItem } from '@/lib/nav/items'
import { cn } from '@/lib/utils'

/**
 * The rail, on a phone.
 *
 * A kader on a 360 px screen is the primary reader, and the old shape -- a
 * horizontally scrolling strip of links under the header -- put half the
 * product off-screen behind a gesture nothing indicated. A bottom bar is
 * one tap, always shows what it holds, and sits where a thumb already is.
 *
 * Four slots plus an overflow, because five 72 px targets is what 360 px
 * actually fits. The overflow is a sheet, not a second strip: the things that
 * end up there (the public catalogue, the atlas) are visited occasionally, and
 * an occasional destination behind one tap is better than every destination
 * behind a scroll.
 */
const PRIMARY_SLOTS = 4

export function MobileNav({ groups }: { groups: readonly NavGroup[] }) {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  const flat = groups.flatMap(g => g.items)
  const overflows = flat.length > PRIMARY_SLOTS
  const primary = overflows ? flat.slice(0, PRIMARY_SLOTS) : flat
  const rest = overflows ? flat.slice(PRIMARY_SLOTS) : []
  const restActive = rest.some(i => isActivePath(pathname, i.href))

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        // pb for the home indicator on a gesture-navigation phone: without it
        // the last row of labels sits under the system bar.
        className="shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        <ul className="flex items-stretch">
          {primary.map(item => (
            <li key={item.href} className="flex-1">
              <NavTab item={item} active={isActivePath(pathname, item.href)} />
            </li>
          ))}

          {overflows && (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-expanded={sheetOpen}
                className={cn(
                  'flex h-full w-full flex-col items-center gap-1 px-1 py-2',
                  restActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <MoreHorizontal aria-hidden className="size-5" />
                <span className="text-[0.65rem] font-medium">Lainnya</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      <Dialog.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/20 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 rounded-t-xl border-t border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]',
              'shadow-[var(--shadow-xl)] transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
              'data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full',
            )}
          >
            {/* The grab handle is the affordance that says this came from the
                bottom and goes back there. */}
            <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />
            <Dialog.Title className="text-sm font-medium text-foreground">
              Semua halaman
            </Dialog.Title>

            <ul className="mt-3 flex flex-col gap-1">
              {rest.map(item => {
                const active = isActivePath(pathname, item.href)
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'interactive flex items-center gap-3 rounded-md p-3',
                        active ? 'bg-secondary' : 'hover:bg-muted',
                      )}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon aria-hidden className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">{item.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

function NavTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-full flex-col items-center gap-1 px-1 py-2',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      {/* Same rule as the desktop rail: the active tab is marked by a bar as
          well as by colour. */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary transition-opacity',
          active ? 'opacity-100' : 'opacity-0',
        )}
      />
      <Icon aria-hidden className="size-5" />
      <span className="text-[0.65rem] font-medium">{item.label}</span>
    </Link>
  )
}

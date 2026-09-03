'use client'

import { Menu } from '@base-ui/react/menu'
import { ChevronDown, LogIn, UserPlus } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

/**
 * The public header's entry point into auth offering both Login and Signup choices.
 */
export function AuthMenu({ variant = 'default' }: { variant?: 'default' | 'hero' }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          'interactive inline-flex items-center gap-1.5 transition-all',
          variant === 'hero'
            ? 'pill lift bg-white px-5 py-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[var(--terrion-green-700)] shadow-sm hover:bg-[var(--terrion-green-50)]'
            : 'pill pill-solid lift px-4.5 py-1.5 text-xs font-bold uppercase tracking-wider shadow-2xs bg-[var(--terrion-green-700)] text-white hover:bg-[var(--terrion-green-900)]',
        )}
      >
        Masuk / Daftar
        <ChevronDown aria-hidden className="size-3.5 transition-transform data-[popup-open]:rotate-180" />
      </Menu.Trigger>

      <Menu.Portal>
        {/* z-50: portalled popup */}
        <Menu.Positioner className="z-50" side="bottom" align="end" sideOffset={6}>
          <Menu.Popup
            className={cn(
              'w-48 rounded-xl border border-border/80 bg-card p-1 shadow-md',
              'origin-[var(--transform-origin,top)] transition-[transform,opacity] duration-150',
              'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
              'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
            )}
          >
            <Menu.Item
              render={<Link href="/login" />}
              className={cn(
                'interactive flex items-center gap-2.5 rounded-lg px-2.5 py-2 outline-none transition-colors',
                'hover:bg-muted/80 data-[highlighted]:bg-muted/80',
              )}
            >
              <LogIn className="size-4 shrink-0 text-[var(--terrion-green-600)]" />
              <span className="text-xs font-semibold text-foreground">Masuk ke Akun</span>
            </Menu.Item>

            <div className="my-1 border-t border-border/60" />

            <Menu.Item
              render={<Link href="/signup" />}
              className={cn(
                'interactive flex items-center gap-2.5 rounded-lg px-2.5 py-2 outline-none transition-colors',
                'hover:bg-muted/80 data-[highlighted]:bg-muted/80',
              )}
            >
              <UserPlus className="size-4 shrink-0 text-[var(--terrion-green-600)]" />
              <span className="text-xs font-semibold text-foreground">Daftar Pembeli</span>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}


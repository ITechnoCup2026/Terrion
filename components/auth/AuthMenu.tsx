'use client'

import { Menu } from '@base-ui/react/menu'
import { ChevronDown, LogIn, UserPlus } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

/**
 * The public header's one entry point into auth.
 *
 * Used to be two buttons side by side (Masuk / Daftar pembeli), which is one
 * more decision than a first-time visitor needs to make before they have even
 * looked at the product. One trigger, one menu: "Masuk" opens straight onto
 * the choice between signing in and registering as a buyer.
 */
export function AuthMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          'interactive inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5',
          'text-sm font-medium text-primary-foreground hover:bg-primary/90',
          'data-[popup-open]:bg-primary/90',
        )}
      >
        Masuk
        <ChevronDown aria-hidden className="size-3.5 transition-transform data-[popup-open]:rotate-180" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8}>
          <Menu.Popup
            className={cn(
              'w-64 rounded-xl border border-border bg-card p-1.5 shadow-[var(--shadow-lg)]',
              'origin-[var(--transform-origin)] transition-[transform,opacity]',
              'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
              'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
            )}
          >
            <Menu.Item
              render={<Link href="/login" />}
              className={cn(
                'interactive flex items-start gap-2.5 rounded-lg p-2.5 outline-none',
                'data-[highlighted]:bg-muted',
              )}
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <LogIn aria-hidden className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">Masuk</span>
                <span className="block text-xs text-muted-foreground">
                  Untuk anggota koperasi dan pembeli terdaftar
                </span>
              </span>
            </Menu.Item>

            {/* "Daftar pembeli", not "Daftar". A bare Daftar reads as an
                invitation to register a cooperative, and there is no such
                form -- a koperasi is verified offline. Naming the audience is
                the difference between a door and a dead end. */}
            <Menu.Item
              render={<Link href="/signup" />}
              className={cn(
                'interactive flex items-start gap-2.5 rounded-lg p-2.5 outline-none',
                'data-[highlighted]:bg-muted',
              )}
            >
              <span
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: 'var(--terrion-gold-50)', color: 'var(--terrion-gold-600)' }}
              >
                <UserPlus aria-hidden className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">Daftar pembeli</span>
                <span className="block text-xs text-muted-foreground">
                  Telusuri katalog dan ajukan permintaan pasokan
                </span>
              </span>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

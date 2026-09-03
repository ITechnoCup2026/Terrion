'use client'

import { Menu } from '@base-ui/react/menu'
import { ChevronDown, ClipboardList, LayoutDashboard, LogOut, Store } from 'lucide-react'
import Link from 'next/link'

import { signOut } from '@/app/actions/auth'
import { homeFor, initialsOf, roleLabel } from '@/lib/auth/display'
import type { UserRole } from '@/lib/auth/roles'
import { cn } from '@/lib/utils'

/**
 * The signed-in state of every header in the product — the counterpart to
 * <AuthMenu>.
 *
 * The public header used to render "Masuk" unconditionally, because when it
 * was written there was no backend to ask who was looking. So a buyer who had
 * just signed in was invited to sign in again, with no way out except clearing
 * a cookie they cannot see. The catalogue is public AND is where a buyer
 * works, which is exactly why that header needs both states: the same page
 * serves a stranger and an account holder.
 *
 * It serves the cooperative shell too, and did not used to. That side had its
 * own arrangement — initials, a name, a role, and a bare square glyph that
 * signed you out on one click — rendered three times over at three different
 * widths, in the rail's foot, the collapsed rail, and the phone's top bar. So
 * the same product asked its two kinds of user to learn two different account
 * controls, and only one of them told you what pressing it would do.
 *
 * Deliberately the same shape as <AuthMenu> — one trigger, one menu — so a
 * header does not change size or rhythm when a session appears.
 */
export function AccountMenu({
  fullName,
  organisation,
  role,
  signOutTo = '/',
  triggerClassName,
}: {
  fullName: string
  organisation: string | null
  role: UserRole
  /**
   * Where signing out lands. A buyer is on public pages and stays on them; a
   * kader signed out of the cooperative shell has nowhere to be but /login.
   */
  signOutTo?: string
  /**
   * For the one place this floats over something rather than sitting in a
   * header: the farm canvas, where a hairline border alone does not separate a
   * white chip from a bright field.
   */
  triggerClassName?: string
}) {
  const home = homeFor(role)

  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          'interactive inline-flex items-center gap-2 rounded-lg border border-border bg-card py-1 pr-2 pl-1',
          'text-sm font-medium text-foreground hover:bg-muted',
          'data-[popup-open]:bg-muted',
          triggerClassName,
        )}
        aria-label={`Akun: ${fullName}`}
      >
        {/* Initials rather than a photo: nothing in the schema stores one, and
            a generic avatar glyph says less than two letters do. */}
        <span
          aria-hidden
          className="flex size-6 items-center justify-center rounded-md bg-secondary text-[0.7rem] font-semibold text-secondary-foreground"
        >
          {initialsOf(fullName)}
        </span>
        {/* The name is the label on a wide header and noise on a 360 px one,
            where the initials already identify the account. */}
        <span className="hidden max-w-32 truncate sm:block">{fullName}</span>
        <ChevronDown aria-hidden className="size-3.5 transition-transform data-[popup-open]:rotate-180" />
      </Menu.Trigger>

      <Menu.Portal>
        {/* z-50: the popup is portalled to the end of <body>, which puts it
            LAST in the DOM but not on top. A positioned element with a real
            z-index paints in a later layer than one with z-index:auto, so the
            catalogue's sticky filter bar (z-30) and this header itself (z-40)
            were both painting over a menu that had no z-index at all. DOM
            order does not settle this; a stacking order does. */}
        <Menu.Positioner className="z-50" side="bottom" align="end" sideOffset={8}>
          <Menu.Popup
            className={cn(
              'w-64 rounded-xl border border-border bg-card p-1.5 shadow-[var(--shadow-lg)]',
              'origin-[var(--transform-origin,top)] transition-[transform,opacity]',
              'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
              'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
            )}
          >
            {/* Who you are, spelled out. On a phone the trigger shows only two
                letters, so this is the one place the full name appears. */}
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-medium text-foreground">{fullName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {organisation ? `${roleLabel(role)} · ${organisation}` : roleLabel(role)}
              </p>
            </div>

            <div className="my-1 h-px bg-border" aria-hidden />

            <Menu.Item
              render={<Link href={home} />}
              className={cn(
                'interactive flex items-center gap-2.5 rounded-lg p-2.5 outline-none',
                'data-[highlighted]:bg-muted',
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                {role === 'buyer'
                  ? <Store aria-hidden className="size-4" />
                  : <LayoutDashboard aria-hidden className="size-4" />}
              </span>
              <span className="text-sm font-medium text-foreground">
                {role === 'buyer' ? 'Katalog pasokan' : 'Dashboard koperasi'}
              </span>
            </Menu.Item>

            {role === 'buyer' && (
              <Menu.Item
                render={<Link href="/my-requests" />}
                className={cn(
                  'interactive flex items-center gap-2.5 rounded-lg p-2.5 outline-none',
                  'data-[highlighted]:bg-muted',
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <ClipboardList aria-hidden className="size-4" />
                </span>
                {/* Sentence case and no subtitle, like the two items either
                    side of it. One row in three carrying a second line made
                    the list ragged, and "ACC" was a fourth name for a state
                    the pengurus's own button calls Terima. */}
                <span className="text-sm font-medium text-foreground">Permintaan saya</span>
              </Menu.Item>
            )}

            {/* A form, not an onClick: signing out has to revoke the session at
                the backend, and a Server Action does that without this menu
                needing to know the endpoint. The form lives inside the popup
                because the popup is portalled -- a form wrapped around the
                trigger would not contain this button in the DOM. */}
            <form action={signOut.bind(null, signOutTo)}>
              <Menu.Item
                nativeButton
                render={<button type="submit" />}
                className={cn(
                  'interactive flex w-full items-center gap-2.5 rounded-lg p-2.5 text-left outline-none',
                  'data-[highlighted]:bg-destructive/10',
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <LogOut aria-hidden className="size-4" />
                </span>
                <span className="text-sm font-medium text-foreground">Keluar</span>
              </Menu.Item>
            </form>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

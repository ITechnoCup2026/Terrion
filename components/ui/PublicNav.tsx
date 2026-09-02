'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { UserRole } from '@/lib/auth/roles'
import { cn } from '@/lib/utils'

/**
 * The public site's navigation.
 *
 * Text, not tabs. This is a header on a marketing-and-catalogue site with
 * three destinations, and dressing three words as filled pills with glyphs and
 * a "Kontrak" badge made the header the busiest strip on a page whose subject
 * is underneath it. The current page is named by ink and a rule; everything
 * else is quiet.
 */
export function PublicNav({ role }: { role?: UserRole }) {
  const pathname = usePathname()

  const showCatalog = !role || role === 'buyer'

  const navItems = [
    ...(showCatalog ? [{ href: '/catalog', label: 'Katalog' }] : []),
    ...(role === 'buyer' ? [{ href: '/my-requests', label: 'Permintaan saya' }] : []),
    { href: '/atlas', label: 'Atlas' },
  ]

  return (
    <nav aria-label="Navigasi publik" className="flex items-center gap-1">
      {navItems.map(item => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'interactive relative px-2.5 py-1.5 text-[0.8125rem]',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
            {active && (
              <span aria-hidden className="absolute inset-x-2.5 -bottom-px h-0.5 bg-primary" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}

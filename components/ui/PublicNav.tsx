'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { UserRole } from '@/lib/auth/roles'
import { homeFor } from '@/lib/auth/display'
import { isActivePath } from '@/lib/nav/active'
import { cn } from '@/lib/utils'

export function PublicNav({ role, isLanding }: { role?: UserRole; isLanding?: boolean }) {
  const pathname = usePathname()

  const showCatalog = !role || role === 'buyer'

  const navItems = [
    { href: role === 'buyer' ? homeFor(role) : '/', label: 'Beranda' },
    ...(showCatalog ? [{ href: '/catalog', label: 'Katalog Pasokan' }] : []),
    ...(role === 'buyer' ? [{ href: '/my-requests', label: 'Permintaan Saya' }] : []),
    { href: '/atlas', label: 'Atlas Pasokan' },
  ]

  return (
    <nav aria-label="Navigasi publik" className="flex items-center gap-1 sm:gap-2">
      {navItems.map(item => {
        const active = isActivePath(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'interactive relative rounded-full px-3.5 py-1.5 text-xs transition-all duration-200',
              active
                ? isLanding
                  ? 'bg-white/25 font-bold text-white border border-white/35 shadow-xs backdrop-blur-md'
                  : 'bg-[var(--terrion-green-100)] font-bold text-[var(--terrion-green-700)] border border-[var(--terrion-green-300)] shadow-2xs'
                : isLanding
                  ? 'font-medium text-white/80 hover:bg-white/15 hover:text-white'
                  : 'font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

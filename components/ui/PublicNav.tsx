'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { UserRole } from '@/lib/auth/roles'
import { cn } from '@/lib/utils'

/**
 * The public site's navigation bar styled to match the marketplace theme.
 */
export function PublicNav({ role, isLanding }: { role?: UserRole; isLanding?: boolean }) {
  const pathname = usePathname()

  const showCatalog = !role || role === 'buyer'

  const navItems = [
    { href: '/', label: 'Beranda' },
    ...(showCatalog ? [{ href: '/catalog', label: 'Katalog Pasokan' }] : []),
    ...(role === 'buyer' ? [{ href: '/my-requests', label: 'Permintaan Saya' }] : []),
    { href: '/atlas', label: 'Atlas Pasokan' },
  ]

  return (
    <nav aria-label="Navigasi publik" className="flex items-center gap-1 sm:gap-2">
      {navItems.map(item => {
        const active = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'interactive relative rounded-full px-3.5 py-1.5 text-xs transition-all duration-200',
              active
                ? isLanding
                  ? 'bg-white/20 font-bold text-white border border-white/30 shadow-2xs'
                  : 'bg-[var(--terrion-green-50)] font-bold text-[var(--terrion-green-700)] border border-[var(--terrion-green-200)] shadow-2xs'
                : isLanding
                  ? 'font-medium text-white/80 hover:bg-white/10 hover:text-white'
                  : 'font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}


'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, Map, Store } from 'lucide-react'

import type { UserRole } from '@/lib/auth/roles'
import { cn } from '@/lib/utils'

export function PublicNav({ role }: { role?: UserRole }) {
  const pathname = usePathname()

  const showCatalog = !role || role === 'buyer'

  const navItems = [
    ...(showCatalog
      ? [
          {
            href: '/catalog',
            label: 'Katalog',
            icon: Store,
          },
        ]
      : []),
    ...(role === 'buyer'
      ? [
          {
            href: '/my-requests',
            label: 'Permintaan Saya',
            icon: ClipboardList,
            badge: 'Kontrak',
          },
        ]
      : []),
    {
      href: '/atlas',
      label: 'Atlas',
      icon: Map,
    },
  ]

  return (
    <nav aria-label="Navigasi publik" className="flex items-center gap-1">
      {navItems.map(item => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'interactive relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-secondary text-secondary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0 text-muted-foreground/80 group-hover:text-foreground" />
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 text-[0.65rem] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

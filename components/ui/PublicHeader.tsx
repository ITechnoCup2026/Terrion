'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { AccountMenu } from '@/components/auth/AccountMenu'
import { AuthMenu } from '@/components/auth/AuthMenu'
import { Logo } from '@/components/ui/Logo'
import { PublicNav } from '@/components/ui/PublicNav'
import { homeFor } from '@/lib/auth/display'
import type { UserRole } from '@/lib/auth/roles'
import { cn } from '@/lib/utils'

export type PublicHeaderUser = {
  fullName: string
  organisation: string | null
  role: UserRole
}

export function PublicHeader({ user }: { user?: PublicHeaderUser | null }) {
  const pathname = usePathname()
  const isLanding = pathname === '/'

  return (
    <header
      className={cn(
        'z-40 transition-colors duration-200',
        isLanding
          ? 'absolute top-0 left-0 right-0 bg-transparent text-white'
          : 'sticky top-0 bg-card/90 backdrop-blur-md border-b border-border/80 text-foreground',
      )}
    >
      <div className="mx-auto flex h-[var(--public-header)] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center justify-start min-w-0">
          <Link
            href={user ? homeFor(user.role) : '/'}
            aria-label="Terrion"
            className="interactive flex items-center gap-2"
          >
            <Logo
              size={26}
              withWordmark={true}
              className={isLanding ? 'brightness-0 invert drop-shadow-xs' : undefined}
            />
          </Link>
        </div>

        <div className="flex items-center justify-center">
          <PublicNav role={user?.role} isLanding={isLanding} />
        </div>

        <div className="flex flex-1 items-center justify-end">
          {user ? (
            <AccountMenu
              fullName={user.fullName}
              organisation={user.organisation}
              role={user.role}
            />
          ) : (
            <AuthMenu variant={isLanding ? 'hero' : 'default'} />
          )}
        </div>
      </div>
    </header>
  )
}



import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * A status pill. Colour is never the only signal -- callers pass the word
 * that says the state, this only tints it -- matching the dashboard rule
 * that a risky week gets an icon and a label, not just a colour.
 */
export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: 'neutral' | 'positive' | 'negative' | 'warning'
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tone === 'neutral' && 'bg-muted text-muted-foreground',
        tone === 'positive' && 'bg-primary/10 text-primary',
        tone === 'negative' && 'bg-destructive/10 text-destructive',
        tone === 'warning' && 'bg-[color-mix(in_oklch,var(--foreground)_12%,transparent)] text-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}

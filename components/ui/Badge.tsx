import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * A status pill. Colour is never the only signal -- callers pass the word
 * that says the state, this only tints it -- matching the dashboard rule
 * that a risky week gets an icon and a label, not just a colour.
 */
export function Badge({
  tone = 'neutral',
  withDot = false,
  children,
  className,
}: {
  tone?: 'neutral' | 'positive' | 'negative' | 'warning' | 'info' | 'emerald' | 'gold' | 'outline'
  withDot?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors',
        tone === 'neutral' && 'bg-muted text-muted-foreground border border-border/50',
        tone === 'positive' && 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-400',
        tone === 'negative' && 'bg-destructive/10 text-destructive border border-destructive/20',
        tone === 'warning' && 'bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400',
        tone === 'info' && 'bg-sky-500/10 text-sky-700 border border-sky-500/20 dark:text-sky-400',
        tone === 'emerald' && 'bg-emerald-600 text-white shadow-xs',
        tone === 'gold' && 'bg-[var(--terrion-gold-500)] text-white shadow-xs',
        tone === 'outline' && 'border border-border bg-background text-foreground',
        className,
      )}
    >
      {withDot && (
        <span
          className={cn(
            'size-1.5 rounded-full shrink-0',
            tone === 'positive' || tone === 'emerald' ? 'bg-emerald-500 animate-pulse-subtle' : '',
            tone === 'warning' || tone === 'gold' ? 'bg-amber-500 animate-pulse-subtle' : '',
            tone === 'negative' ? 'bg-destructive animate-pulse-subtle' : '',
            tone === 'info' ? 'bg-sky-500 animate-pulse-subtle' : '',
            tone === 'neutral' || tone === 'outline' ? 'bg-muted-foreground/60' : '',
          )}
        />
      )}
      {children}
    </span>
  )
}

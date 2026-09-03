import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * A status pill.
 *
 * Colour is never the only signal -- callers pass the word that says the
 * state, this only tints it. Four tones, mapped onto the four things colour
 * means anywhere in this product:
 *
 *   positive  the cooperative's own, settled, accepted        green
 *   warning   waiting on a decision, at or over a limit       gold
 *   negative  declined, failed                                red
 *   neutral   none of the above                               ink
 *
 * The pulsing dot is gone. A badge that throbs on a table of forty rows is
 * forty things moving on a screen where nothing has changed, and it made
 * "menunggu" look like an alarm rather than a state.
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
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap transition-colors',
        tone === 'neutral' && 'border-border/80 bg-muted/80 text-muted-foreground',
        tone === 'positive' && 'border-[var(--terrion-green-300)] bg-[var(--terrion-green-50)] text-[var(--terrion-green-700)] shadow-2xs',
        tone === 'warning' && 'border-[var(--terrion-gold-500)]/40 bg-[var(--terrion-gold-50)] text-[var(--terrion-gold-600)] shadow-2xs',
        tone === 'negative' && 'border-destructive/30 bg-destructive/10 text-destructive',
        className,
      )}
    >
      {children}
    </span>
  )
}

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
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap',
        tone === 'neutral' && 'border-border bg-muted text-muted-foreground',
        tone === 'positive' && 'border-[var(--terrion-green-200)] bg-secondary text-[var(--terrion-green-700)]',
        tone === 'warning' && 'border-[var(--terrion-gold-200)] bg-[var(--terrion-gold-50)] text-[var(--terrion-gold-600)]',
        tone === 'negative' && 'border-destructive/25 bg-destructive/8 text-destructive',
        className,
      )}
    >
      {children}
    </span>
  )
}

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * The explicit "nothing here" every list owes its reader.
 *
 * RLS denials come back as zero rows, not as errors, so an empty result and a
 * result the caller may not see are indistinguishable at the query layer. A
 * bare empty container therefore always reads as a broken page. Saying which
 * it is — and what to do next — is the whole job.
 */

// A neutral illustration stand-in; the pack has no icon set and one glyph
// keeps the block from collapsing to a line of grey text.
function Mark() {
  return (
    <div
      aria-hidden
      className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 7h18M3 12h18M3 17h10" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export function EmptyState({
  title = 'Belum ada data',
  description,
  action,
  className,
}: {
  title?: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center',
        className,
      )}
    >
      <Mark />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

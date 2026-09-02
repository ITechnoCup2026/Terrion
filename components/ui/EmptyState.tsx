import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * The explicit "nothing here" every list owes its reader.
 *
 * RLS denials come back as zero rows, not as errors, so an empty result and a
 * result the caller may not see are indistinguishable at the query layer. A
 * bare empty container therefore always reads as a broken page. Saying which
 * it is — and what to do next — is the whole job.
 *
 * There is no illustration. The glyph that used to sit above the title was
 * three grey lines in a circle: it stood for nothing, said nothing, and was
 * the first thing the reader's eye landed on. An empty screen is an invitation
 * to act, so the sentence and the button are the entire design.
 */
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
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center',
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

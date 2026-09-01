import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * The one card surface.
 *
 * The product had two, used interchangeably: `rounded-lg border bg-card` with
 * no shadow on purchases, requests and every message screen, and `rounded-xl
 * … shadow-[var(--shadow-xs)]` on the dashboard and plot list. Both are
 * defensible; having both is not, because a reader moving from the dashboard
 * to purchases sees the corners and the lift change under content that is
 * doing the same job. This is the second one — the tinted hairline shadow
 * gives a white card on a white page an edge that a 1px border alone does not.
 *
 * `tone="alert"` is for a card that reports something over a limit. It is the
 * border that changes, never the fill: a red panel in a list of white ones
 * shouts before it has been read, and on these screens the thing being flagged
 * is usually information, not an error.
 */
export function Card({
  as: Tag = 'div',
  tone = 'default',
  pad = 'md',
  className,
  children,
  ...rest
}: {
  as?: 'div' | 'section' | 'article' | 'li'
  tone?: 'default' | 'alert'
  pad?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
  children: ReactNode
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn(
        'rounded-xl border bg-card shadow-[var(--shadow-xs)]',
        tone === 'alert' ? 'border-destructive/40' : 'border-border',
        pad === 'sm' && 'p-3',
        pad === 'md' && 'p-4',
        pad === 'lg' && 'p-4 sm:p-6',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/**
 * A row of headline figures — the four numbers that open the dashboard and the
 * plot list.
 *
 * Both pages had this markup inline and identical, which is how the two copies
 * would eventually stop being identical. Two columns on a phone rather than
 * four: four figures across 360 px puts each label on three lines.
 */
export function MetricRow({
  items,
  className,
}: {
  items: readonly { label: string; value: ReactNode }[]
  className?: string
}) {
  return (
    <dl className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}>
      {items.map(item => (
        <Card key={item.label} pad="none" className="px-3 py-2.5">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
            {item.value}
          </dd>
        </Card>
      ))}
    </dl>
  )
}

/**
 * A whole screen that says one thing: not found, failed to load, backend
 * unreachable. Three files were drawing this centred card separately and had
 * already drifted apart in radius and shadow.
 */
export function MessageCard({
  title,
  children,
  action,
  footnote,
  className,
}: {
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  /** Small print under the action — an error digest, for instance. */
  footnote?: ReactNode
  className?: string
}) {
  return (
    <Card pad="lg" className={cn('text-center', className)}>
      <p className="text-base font-semibold text-foreground">{title}</p>
      {children && (
        <div className="mx-auto mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
      {footnote && <div className="mt-4 text-xs text-muted-foreground">{footnote}</div>}
    </Card>
  )
}

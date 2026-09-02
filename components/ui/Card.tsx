import type { LucideIcon } from 'lucide-react'
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
 * A card's own title bar: what this panel is, one line on what it holds, and
 * the controls that belong to it.
 *
 * Every panel in the product was opening with `<p class="text-sm font-semibold">`
 * followed by an optional `<p class="text-xs text-muted-foreground">`, six
 * times, with the gap between them different each time. A panel that states
 * its own name is what makes a dense screen scannable — an ERP is read by
 * jumping between headings, not by reading down.
 */
export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export type Metric = {
  label: string
  value: ReactNode
  /** One line naming what the figure counts, when the label cannot. */
  hint?: ReactNode
  /** A glyph for the tile's corner — the fastest way to tell four apart. */
  icon?: LucideIcon
  /** Optional trend badge info (+12%, -5%, etc.) */
  trend?: {
    value: string
    positive?: boolean
  }
  /**
   * `accent` is for the one figure on the row that is a call to action — a
   * count of risky weeks, a pile-up. At most one per row: a row where every
   * tile is emphasised is a row where none is.
   */
  tone?: 'default' | 'accent' | 'success' | 'warning'
}

/**
 * A row of headline figures — the four numbers that open the dashboard and the
 * plot list.
 */
export function MetricRow({
  items,
  className,
}: {
  items: readonly Metric[]
  className?: string
}) {
  return (
    <dl className={cn('grid grid-cols-2 gap-4 sm:grid-cols-4', className)}>
      {items.map(item => {
        const Icon = item.icon
        const accent = item.tone === 'accent'
        const isSuccess = item.tone === 'success'
        const isWarning = item.tone === 'warning'
        return (
          <Card
            key={item.label}
            pad="none"
            className={cn(
              'group/metric relative overflow-hidden p-4 sm:p-5 transition-all duration-200 card-lift',
              accent && 'border-accent/40 bg-accent/5',
              isSuccess && 'border-emerald-500/30 bg-emerald-500/5',
              isWarning && 'border-amber-500/30 bg-amber-500/5',
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              {Icon && (
                <div
                  className={cn(
                    'flex size-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover/metric:scale-105 shadow-xs',
                    accent
                      ? 'bg-[var(--terrion-gold-500)] text-white'
                      : isSuccess
                      ? 'bg-emerald-600 text-white'
                      : isWarning
                      ? 'bg-amber-500 text-white'
                      : 'bg-primary/10 text-primary',
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                </div>
              )}
              {item.trend && (
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold',
                    item.trend.positive
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
                  )}
                >
                  {item.trend.positive ? '↑' : '↓'} {item.trend.value}
                </span>
              )}
            </div>

            <dt className="text-xs font-semibold text-muted-foreground">
              {item.label}
            </dt>

            <dd className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
              {item.value}
            </dd>

            {item.hint && (
              <p className="mt-1 text-[0.72rem] text-muted-foreground leading-tight">{item.hint}</p>
            )}
          </Card>
        )
      })}
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

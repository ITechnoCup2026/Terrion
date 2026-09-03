import type { ReactNode } from 'react'

import { Sparkbars } from '@/components/ui/Sparkbars'
import { cn } from '@/lib/utils'

/**
 * The one card surface.
 *
 * White paper on the page's green-grey ground, with a hairline and a contact
 * shadow. It carried no shadow at all for a while, on the reasoning that a
 * panel sitting in the page is not floating above it — true, but the page was
 * also white, so every card was a rectangle of hairlines and no screen had an
 * object on it. A sheet of paper on a desk casts a millimetre of shadow; that
 * is what this is, and it is still far below the palette's floating rungs.
 *
 * `tone="alert"` is for a card that reports something over a limit. It is the
 * border that changes, never the fill: a tinted panel in a list of white ones
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
        'rounded-lg border bg-card shadow-[var(--shadow-xs)]',
        tone === 'alert' ? 'border-accent/60' : 'border-border',
        pad === 'sm' && 'p-3',
        pad === 'md' && 'p-4',
        pad === 'lg' && 'p-5 sm:p-6',
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
 * A panel that states its own name is what makes a dense screen scannable — an
 * ERP is read by jumping between headings, not by reading down.
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
          <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
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
  /**
   * The series the figure summarises, drawn beside it.
   */
  series?: {
    values: readonly number[]
    /** The bucket this figure is naming — the peak week, usually. */
    highlight?: number
    flagged?: readonly boolean[]
  }
  /**
   * `accent` is for call to action, `positive` for success/accepted, `negative` for declined, `info` for totals.
   */
  tone?: 'default' | 'accent' | 'positive' | 'negative' | 'info'
  icon?: any
}

/**
 * A row of headline figures — the four numbers that open the dashboard, the
 * plot list and the requests inbox.
 */
export function MetricRow({
  items,
  className,
}: {
  items: readonly Metric[]
  className?: string
}) {
  return (
    <dl className={cn('grid grid-cols-2 gap-4 lg:grid-cols-4', className)}>
      {items.map(item => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            className={cn(
              'panel relative flex flex-col justify-between p-5 transition-all hover:border-[var(--terrion-green-300)]',
              item.tone === 'accent' && 'border-[var(--terrion-gold-500)]/40 bg-[var(--terrion-gold-50)]/30',
            )}
          >

            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <dt className="text-xs font-medium">{item.label}</dt>
              {Icon && (
                <div
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                    item.tone === 'accent'
                      ? 'bg-[var(--terrion-gold-200)]/60 text-[var(--terrion-gold-600)]'
                      : item.tone === 'positive'
                        ? 'bg-[var(--terrion-green-100)] text-[var(--terrion-green-700)]'
                        : item.tone === 'negative'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-muted text-[var(--terrion-green-600)]',
                  )}
                >
                  <Icon className="size-4" />
                </div>
              )}
            </div>

            <div className="mt-3">
              <dd
                className={cn(
                  'text-3xl font-bold tracking-tight tabular-nums',
                  item.tone === 'accent'
                    ? 'text-[var(--terrion-gold-600)]'
                    : item.tone === 'positive'
                      ? 'text-[var(--terrion-green-700)]'
                      : item.tone === 'negative'
                        ? 'text-destructive'
                        : 'text-[var(--terrion-green-700)]',
                )}
              >
                {item.value}
              </dd>
              {item.hint && (
                <p
                  className={cn(
                    'mt-1.5 text-[0.6875rem] font-medium leading-snug',
                    item.tone === 'accent'
                      ? 'text-[var(--terrion-gold-600)]'
                      : 'text-muted-foreground',
                  )}
                >
                  {item.hint}
                </p>
              )}
            </div>
          </div>
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
      {footnote && (
        <div className="mt-4 text-xs text-[var(--terrion-ink-faint)]">{footnote}</div>
      )}
    </Card>
  )
}

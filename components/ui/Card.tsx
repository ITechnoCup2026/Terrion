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
   *
   * Optional and honestly so: "Lahan" is a count with no shape, and inventing
   * a sparkline for it would be drawing a picture of nothing. A figure that
   * has a series shows it; a figure that does not, does not.
   */
  series?: {
    values: readonly number[]
    /** The bucket this figure is naming — the peak week, usually. */
    highlight?: number
    flagged?: readonly boolean[]
  }
  /**
   * `accent` is for the one figure on the row that is a call to action — a
   * count of risky weeks, a pile-up. At most one per row: a row where every
   * tile is emphasised is a row where none is.
   */
  tone?: 'default' | 'accent'
}

/**
 * A row of headline figures — the four numbers that open the dashboard, the
 * plot list and the requests inbox.
 *
 * One ruled row, not four cards. Four separately bordered, separately
 * shadowed boxes read as four unrelated objects that happen to be adjacent;
 * these figures are one statement about one cooperative, and a ledger's
 * column rules say that where four containers cannot.
 *
 * The icons are gone. A scale, a rising line, a warning triangle and a
 * seedling in a coloured chip added a second thing to decode above every
 * figure without telling the reader anything the label did not already say —
 * and dressed the whole row in gradient at the exact moment the page wanted to
 * be read quickly.
 *
 * What replaced them earns its place: where a figure summarises a series, the
 * series is drawn next to it. That is not decoration standing in for an icon,
 * it is the second half of the sentence — "63 tonnes" and "all of it in week
 * nine" are different facts, and the row used to be able to say only the
 * first.
 */
export function MetricRow({
  items,
  className,
}: {
  items: readonly Metric[]
  className?: string
}) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-xs)] sm:grid-cols-4',
        className,
      )}
    >
      {items.map(item => (
        <div
          key={item.label}
          className={cn(
            'p-4 sm:p-5',
            // Cell rules rather than four bordered boxes. On a phone the row
            // folds to two columns, so the second pair needs a rule above it
            // that the four-across layout must not keep.
            'even:border-l even:border-border',
            '[&:nth-child(n+3)]:border-t [&:nth-child(n+3)]:border-border',
            'sm:[&:nth-child(n+2)]:border-l sm:[&:nth-child(n+3)]:border-t-0',
          )}
        >
          <dt className="text-xs text-muted-foreground">{item.label}</dt>

          {/* Figure left, its shape right. Stacking the sparkline under the
              number instead would make every tile two rows taller and push the
              alert below the fold on a laptop, which is the one thing this
              page cannot afford. */}
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <dd
              className={cn(
                'text-[1.75rem] leading-none font-semibold tracking-tight tabular-nums',
                // Gold is the whole signal. No fill, no chip, no border — the
                // figure itself is the thing that needs a decision, so the
                // figure itself is what changes colour.
                item.tone === 'accent' ? 'text-accent' : 'text-foreground',
              )}
            >
              {item.value}
            </dd>

            {item.series && (
              <Sparkbars
                values={item.series.values}
                highlight={item.series.highlight}
                flagged={item.series.flagged}
                className="w-20 shrink-0"
              />
            )}
          </div>
          {item.hint && (
            <p className="mt-2 text-[0.6875rem] leading-snug text-[var(--terrion-ink-faint)]">
              {item.hint}
            </p>
          )}
        </div>
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
      {footnote && (
        <div className="mt-4 text-xs text-[var(--terrion-ink-faint)]">{footnote}</div>
      )}
    </Card>
  )
}

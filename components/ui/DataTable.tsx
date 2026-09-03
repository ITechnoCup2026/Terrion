import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * The one table surface.
 *
 * Three screens were hand-rolling their own -- purchases had two, requests had
 * a third -- and they had already drifted: different header tints, different
 * row rules, one with a rounded frame and two without. A table is the densest
 * thing in this product and the one a pengurus reads for minutes at a time, so
 * the details that make it readable are not decoration:
 *
 *   sticky header  a 40-row order history scrolled inside its own frame loses
 *                  its column names after eight rows otherwise
 *   row hover      the eye tracks across a wide row by the tint, not by
 *                  counting cells
 *   tabular nums   already global for th/td (see globals.css), so figures line
 *                  up in a column instead of shimmering
 *   right-aligned  quantities align on their last digit, which is the only way
 *   numerics       two of them can be compared at a glance
 *
 * The frame scrolls horizontally rather than wrapping: a kader on 360 px gets
 * a table they can push sideways, not four columns folded into a paragraph.
 */
export function TableFrame({
  children,
  className,
  /** Caps the body height and lets the header stick above the scroll. */
  maxHeight,
}: {
  children: ReactNode
  className?: string
  maxHeight?: string
}) {
  return (
    <div
      className={cn(
        'w-full overflow-auto rounded-lg border border-border bg-card',
        // print:overflow-visible, or the RDKK form is clipped to one screen.
        'print:overflow-visible print:rounded-none print:border-0',
        className,
      )}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {children}
    </div>
  )
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return <table className={cn('w-full border-collapse text-sm', className)}>{children}</table>
}

export function THead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <thead
      className={cn(
        'sticky top-0 z-10 bg-[var(--terrion-green-50)]/90 backdrop-blur-xs text-left text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--terrion-green-900)] border-b border-border',
        '[&_th]:border-b [&_th]:border-border',
        'print:static',
        className,
      )}
    >
      {children}
    </thead>
  )
}

export function TBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tbody
      className={cn(
        '[&_tr]:border-b [&_tr]:border-border/70 [&_tr:last-child]:border-0',
        '[&_tr]:transition-colors [&_tr:hover]:bg-[var(--terrion-green-50)]/40',
        className,
      )}
    >
      {children}
    </tbody>
  )
}

/**
 * A header cell. `numeric` is for a column holding a figure, and it carries
 * the alignment for the whole column: the body cell below it has to ask for
 * the same thing, which is why both take the same prop.
 */
export function Th({
  children,
  numeric = false,
  className,
  ...rest
}: {
  children?: ReactNode
  numeric?: boolean
  className?: string
} & React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-3 font-semibold whitespace-nowrap text-[0.7rem]',
        numeric && 'text-right',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  numeric = false,
  className,
  ...rest
}: {
  children?: ReactNode
  numeric?: boolean
  className?: string
} & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('px-4 py-3.5 align-middle', numeric && 'text-right tabular-nums whitespace-nowrap', className)}
      {...rest}
    >
      {children}
    </td>
  )
}

/**
 * A sortable column header.
 */
export function SortableTh({
  label,
  active,
  desc,
  onSort,
  numeric = false,
}: {
  label: string
  active: boolean
  desc: boolean
  onSort: () => void
  numeric?: boolean
}) {
  return (
    <Th
      numeric={numeric}
      aria-sort={active ? (desc ? 'descending' : 'ascending') : 'none'}
      className="p-0"
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          'interactive inline-flex w-full items-center gap-1.5 px-4 py-3 font-semibold hover:text-[var(--terrion-green-700)]',
          numeric && 'justify-end',
          active && 'text-[var(--terrion-green-700)]',
        )}
      >
        {label}
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={cn(
            'size-3 shrink-0 transition-all',
            active ? 'opacity-100' : 'opacity-35',
            active && desc && 'rotate-180',
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9.5V2.5M3 5.5 6 2.5l3 3" />
        </svg>
      </button>
    </Th>
  )
}

/**
 * The strip above a table: filters on the left, counts and actions on the
 * right.
 */
export function TableToolbar({
  children,
  meta,
  className,
}: {
  children?: ReactNode
  meta?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-3 print:hidden',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {meta && <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">{meta}</div>}
    </div>
  )
}

/**
 * A segmented filter — the status tabs above the requests table.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/70 p-1 shadow-2xs"
    >
      {options.map(option => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'interactive inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150',
              active
                ? 'bg-card font-semibold text-foreground shadow-xs ring-1 ring-border/60'
                : 'text-muted-foreground hover:bg-card/40 hover:text-foreground',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.8 py-0.2 text-[0.65rem] font-semibold tabular-nums',
                  active
                    ? 'bg-[var(--terrion-green-100)] text-[var(--terrion-green-700)]'
                    : 'bg-muted-foreground/15 text-muted-foreground',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

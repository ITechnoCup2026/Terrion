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
        // The tint plus the bottom rule is what separates the head from row one
        // once the head is sticky and rows slide under it. Fully opaque, not
        // blurred: a translucent header lets the top row bleed through it at
        // exactly the moment the reader is trying to read the column name.
        'sticky top-0 z-10 bg-muted text-left text-[0.6875rem] font-medium text-muted-foreground',
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
        '[&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0',
        '[&_tr]:transition-colors [&_tr:hover]:bg-secondary/45',
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
 *
 * Not called `align` — that is already an attribute of <th> and <td>, with a
 * different set of values, and shadowing it makes the component reject the
 * only values it accepts.
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
        'px-4 py-2.5 font-normal whitespace-nowrap',
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
      className={cn('px-4 py-3 align-top', numeric && 'text-right tabular-nums whitespace-nowrap', className)}
      {...rest}
    >
      {children}
    </td>
  )
}

/**
 * A sortable column header.
 *
 * The arrow is drawn for every sortable column, not only the active one --
 * dimmed until it is the sort. A column that only reveals it is sortable once
 * you have already sorted it is a control nobody finds.
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
          'interactive inline-flex w-full items-center gap-1 px-4 py-2.5 hover:text-foreground',
          numeric && 'justify-end',
          active && 'text-foreground',
        )}
      >
        {label}
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={cn(
            'size-3 shrink-0 transition-all',
            active ? 'opacity-100' : 'opacity-30',
            active && desc && 'rotate-180',
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
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
 * right. Its job is to keep every table's controls in the same place, because
 * a filter row that moves between screens has to be looked for each time.
 */
export function TableToolbar({
  children,
  meta,
  className,
}: {
  children?: ReactNode
  /** The right-hand side: a row count, an export button. */
  meta?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 print:hidden',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
      {meta && <div className="flex items-center gap-2 text-xs text-muted-foreground">{meta}</div>}
    </div>
  )
}

/**
 * A segmented filter — the status tabs above the requests table.
 *
 * Previously five separate buttons that swapped between the `default` and
 * `outline` variants, so the whole row changed weight as you moved through it
 * and the group did not read as one control. One track, one thumb.
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
      className="inline-flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-muted p-0.5"
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
              'interactive inline-flex items-center gap-1.5 rounded-[calc(var(--radius-md)-0.125rem)] px-2.5 py-1 text-[0.8125rem]',
              active
                ? 'bg-card font-medium text-foreground shadow-[var(--shadow-sm)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[0.65rem] tabular-nums',
                  active ? 'bg-secondary text-secondary-foreground' : 'bg-border text-muted-foreground',
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

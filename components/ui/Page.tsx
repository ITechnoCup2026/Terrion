import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * The frame every non-landing page sits in.
 *
 * Before this, each page invented its own: `max-w-6xl px-4 py-6` on the
 * dashboard, `max-w-3xl px-4 py-6` on purchases, `max-w-xl p-4 sm:p-6` on the
 * new-plot form, `max-w-6xl px-4 py-8` on the catalogue. Four different top
 * margins meant the header moved a few pixels every time you changed tab,
 * which reads as the page reloading into a slightly different app.
 *
 * The widths themselves are not arbitrary and are kept as named intents:
 *
 *   form  a single column of inputs — a line of text you can read without
 *         moving your eyes across the screen
 *   doc   a document: prose, one table, a list of cards
 *   wide  a grid or a chart, which needs the room
 *
 * The shell deliberately applies no padding (a layout that pads cannot have a
 * child that fills the screen, and the farm page needs to), so this is where
 * the padding actually lives.
 */
const WIDTHS = {
  form: 'max-w-2xl',
  doc: 'max-w-5xl',
  wide: 'max-w-[1600px]',
  full: 'max-w-full',
} as const

export function Page({
  width = 'wide',
  className,
  children,
}: {
  width?: keyof typeof WIDTHS
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8', WIDTHS[width], className)}>
      {children}
    </div>
  )
}

/**
 * The title block: what this page is, one line on what it shows, and the one
 * action it offers.
 *
 * Titles used to run from `text-lg` to `text-3xl` across five pages with no
 * rule behind which got which. One scale, one weight, one gap — so the eye
 * lands in the same place on every screen. `actions` sits on the same optical
 * baseline as the title on a wide screen and wraps under the description on a
 * phone, rather than each page hand-rolling its own flex row.
 */
export function PageHeader({
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
    <div
      className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-3', className)}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-[1.625rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** A titled block within a page — one rung below <PageHeader>. */
export function SectionHeading({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h2 className={cn('text-sm font-semibold text-foreground', className)}>{children}</h2>
  )
}

'use client'

import type { ReactNode } from 'react'

import { useImmersiveChrome } from '@/components/ui/ImmersiveChrome'
import { cn } from '@/lib/utils'

/**
 * The frame a farm page is laid out in: a panel beside the picture.
 *
 * The same shape as the Atlas, deliberately. Both pages are a canvas the
 * reader drags around with facts about what is on it, and they used to say
 * that in two different ways: the Atlas put its chrome in one panel, while the
 * plot page floated a title card, a slider and three shell controls over five
 * corners of the farm. Every one of those covered part of the picture, and
 * none of them could be moved out of the way.
 *
 * Responsive by stacking rather than by hiding. Below `lg` the panel goes
 * UNDER the canvas -- `flex-col-reverse`, so the picture is what a phone opens
 * on and the facts are a thumb-scroll below it. The panel then takes a share
 * of the viewport rather than a pixel height, so it holds the same proportion
 * on a small phone as on a tablet.
 */
export function FarmShell({
  header, children, footer, canvas, panelLabel,
}: {
  /** The page's own heading: what this farm is called, and the way back out. */
  header?: ReactNode
  /** The panel body. Scrolls on its own; the page never does. */
  children: ReactNode
  /** Pinned to the bottom of the panel, out of the scroller. The time slider
   *  lives here: it is a control rather than a fact, and scrolling it out of
   *  reach would be the same mistake as floating it over the canvas. */
  footer?: ReactNode
  canvas: ReactNode
  panelLabel: string
}) {
  // Null on the public garden, which has no account and no navigation. The
  // shell is the same either way; only what it is given differs.
  const chrome = useImmersiveChrome()

  return (
    <div className="flex h-full w-full flex-col-reverse overflow-hidden lg:flex-row">
      <aside
        aria-label={panelLabel}
        className={cn(
          'flex shrink-0 flex-col border-border bg-card',
          'h-[50dvh] border-t lg:h-full lg:w-[22rem] lg:border-t-0 lg:border-r xl:w-96',
        )}
      >
        {chrome && (
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-3 py-2.5">
            <div className="min-w-0 flex-1">{chrome.workspace}</div>
            <div className="shrink-0">{chrome.account}</div>
          </div>
        )}

        {chrome?.nav}
        {header}

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer && <div className="shrink-0 border-t border-border p-3">{footer}</div>}
      </aside>

      {/* min-h-0 so this may shrink inside the flex column on a phone. Without
          it the canvas keeps its content height and pushes the panel off. */}
      <div className="relative min-h-0 flex-1">{canvas}</div>
    </div>
  )
}

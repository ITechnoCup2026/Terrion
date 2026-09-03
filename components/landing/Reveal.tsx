'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * A section that arrives when the reader does.
 *
 * The landing page is one continuous field from the hero to the footer, which
 * removes the section boundaries that used to tell a reader "a new argument
 * starts here". Motion carries that job instead: each block settles into place
 * as it enters the viewport, so the page still reads as a sequence of claims
 * rather than one long wall of green.
 *
 * It fires ONCE. A block that fades out again when it leaves the viewport, and
 * back in when you scroll up, is a page fighting the reader's scroll — the
 * animation is an entrance, not a state.
 *
 * `rootMargin` pulls the trigger line a fifth of the way up the viewport, so a
 * block has already begun settling by the time it is properly on screen; a
 * reveal that starts exactly at the edge is one the reader watches happen
 * instead of one they simply find finished.
 *
 * Everything about the motion itself lives in CSS (`.reveal` in globals.css),
 * which is also where `prefers-reduced-motion` turns it into no motion at all
 * rather than fast motion. This component only decides *when*.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = 'up',
}: {
  children: React.ReactNode
  className?: string
  /** Milliseconds after the block crosses the line. Use to stagger siblings. */
  delay?: number
  variant?: 'up' | 'left' | 'right' | 'fade'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // No observer (an older browser): show it, on the next frame rather than
    // synchronously — a page whose content depends on IntersectionObserver
    // existing is a page that can render blank.
    if (typeof IntersectionObserver === 'undefined') {
      const frame = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(frame)
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          setShown(true)
          observer.disconnect()
        }
      },
      // A small negative bottom margin, not a large one. It buys the same
      // "already settling by the time you look at it" feel, but -20% carved a
      // fifth of the viewport into a zone where a block that comes to rest
      // never reveals at all — which is exactly what happens to a short
      // section near the foot of the page on a tall screen.
      { rootMargin: '0px 0px -8% 0px', threshold: 0 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-shown={shown ? 'true' : 'false'}
      className={cn('reveal', `reveal-${variant}`, className)}
      style={{ ['--reveal-delay' as string]: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

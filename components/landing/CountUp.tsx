'use client'

import { useEffect, useRef, useState } from 'react'

import { formatNumberId } from '@/lib/format/number'

/** Ease-out cubic: fast at the start, settling rather than stopping. */
const ease = (t: number) => 1 - (1 - t) ** 3

/**
 * A total that counts up to itself the first time it is seen.
 *
 * Only used on the landing page's counts strip, and only there. Inside the
 * product a figure that animates is a figure you cannot read at a glance and
 * cannot screenshot mid-flight — the dashboard's numbers arrive at their value
 * immediately, and must keep doing so.
 *
 * The final text is rendered on the server and sits in the markup, so the
 * figure is correct before this ever runs and correct if it never does. This
 * only replaces it with intermediate values while the animation is in flight.
 */
export function CountUp({
  value,
  duration = 1100,
  className,
}: {
  value: number
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState<number | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // Asked for less motion: the number is simply the number.
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (still || typeof IntersectionObserver === 'undefined') return

    let frame = 0
    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(e => e.isIntersecting)) return
        observer.disconnect()

        const start = performance.now()
        const step = (now: number) => {
          const t = Math.min((now - start) / duration, 1)
          setDisplay(value * ease(t))
          if (t < 1) frame = requestAnimationFrame(step)
          else setDisplay(null) // hand the exact server-rendered value back
        }
        frame = requestAnimationFrame(step)
      },
      { threshold: 0.4 },
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value, duration])

  return (
    <span ref={ref} className={className}>
      {formatNumberId(display ?? value, 0)}
    </span>
  )
}

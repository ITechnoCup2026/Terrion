'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { placeAnchored, type Placement, type Point } from '@/lib/ui/anchor'
import { cn } from '@/lib/utils'

/**
 * A panel that opens where you clicked.
 *
 * The farm canvas has no DOM inside it -- every crop, fence and roof is paint
 * on one <canvas> -- so there is no element for a popover library to anchor
 * to, only the coordinates of the click. lib/ui/anchor.ts works out the
 * position; this measures the panel, applies it, and handles dismissal.
 *
 * It is deliberately positioned `fixed` in client coordinates, the same space
 * a PointerEvent reports in, so the canvas can hand its click straight here
 * without converting through the page's scroll position or the canvas's own
 * camera. Those conversions are where an anchored panel usually goes wrong.
 *
 * Placement runs in a layout effect after the first paint because the panel's
 * height depends on its contents, and its contents are the caller's. Rendering
 * it hidden for one frame is what stops it appearing in the wrong place and
 * jumping.
 */
export function AnchoredPanel({
  point, label, onClose, className, children,
}: {
  /** Where the click landed, in client coordinates. */
  point: Point
  /** Names the panel for a screen reader; it is a dialog, not decoration. */
  label: string
  onClose: () => void
  className?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)

  // Measure, then place. Re-run when the point moves, which is every click.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const apply = () => {
      const { offsetWidth: width, offsetHeight: height } = el
      setPlacement(placeAnchored(
        point,
        { width, height },
        { width: window.innerWidth, height: window.innerHeight },
      ))
    }

    apply()

    // The contents can change height after opening -- a harvest window
    // arriving, a long member name wrapping -- and a panel that was placed
    // against the bottom edge would then hang off it.
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    window.addEventListener('resize', apply)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [point])

  // Escape closes, and so does a pointer landing anywhere else -- including
  // back on the canvas, which is how you dismiss one block and open another.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }

    window.addEventListener('keydown', onKey)
    // Capture, so this runs before the canvas's own handler decides the click
    // was a fresh selection and immediately reopens a panel.
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className={cn(
        'fixed z-50 w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-border',
        'bg-card/95 p-4 shadow-[var(--shadow-lg)] backdrop-blur-sm',
        // Hidden for exactly one frame, while the panel is measured. Without
        // this it renders at 0,0 and slides across the screen into place.
        placement ? 'animate-fade opacity-100' : 'pointer-events-none opacity-0',
        className,
      )}
      style={{ left: placement?.x ?? 0, top: placement?.y ?? 0 }}
    >
      {/* The tail, pointing back at the tile the panel is describing. Drawn as
          a rotated square so it inherits the panel's border and background
          rather than needing its own colour that would drift from them. */}
      <span
        aria-hidden
        className={cn(
          'absolute size-2.5 rotate-45 border-border bg-card',
          placement?.side === 'top'
            ? 'right-5 -bottom-[6px] border-r border-b'
            : 'top-[-6px] right-5 border-t border-l',
        )}
      />
      {children}
    </div>
  )
}

import { commodityStyle } from '@/lib/catalog/commodity-style'
import { cn } from '@/lib/utils'

/**
 * A commodity's identity as a small tile: its hue as the ground, its glyph
 * stroked on top.
 *
 * This was living inside the requests table, which meant every other list of
 * crops — the beranda's two panels among them — either drew a bare coloured
 * bar or nothing at all, and the same padi row looked like a different thing
 * on each screen. Colour and glyph together, because colour alone is not an
 * identifier for a reader who cannot separate two of these hues.
 */
export function CropMark({
  name,
  size = 'sm',
  className,
}: {
  name: string
  /** `sm` for a table cell, `md` for a list row that has to be scannable. */
  size?: 'sm' | 'md'
  className?: string
}) {
  const style = commodityStyle(name)

  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center shadow-2xs ring-1 ring-inset ring-black/[0.04]',
        size === 'sm' ? 'size-7 rounded-md' : 'size-9 rounded-lg',
        className,
      )}
      style={{ background: style.tint }}
    >
      <svg
        viewBox="0 0 24 24"
        className={size === 'sm' ? 'size-3.5' : 'size-[1.125rem]'}
        fill="none"
        stroke={style.hue}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={style.glyph} />
      </svg>
    </span>
  )
}

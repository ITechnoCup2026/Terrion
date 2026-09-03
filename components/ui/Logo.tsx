import Image from 'next/image'

import { cn } from '@/lib/utils'

/** Width:height of public/brand/logo-wordmark.png, needed to size it from `size`. */
const WORDMARK_RATIO = 593 / 163

/**
 * Width:height of public/brand/logo.png. It is 225x219, not square -- close
 * enough to look square and far enough for next/image to complain: declaring
 * a 1:1 box for it means the CSS-derived height no longer matches the stated
 * width, which is exactly the "width or height modified, but not the other"
 * warning. `size` stays the height, as it is for the wordmark.
 */
const MARK_RATIO = 225 / 219

/**
 * The Terrion mark, in one place.
 *
 * Every header previously inlined its own SVG seedling, which meant four
 * copies to update and four chances for them to drift. This is the single
 * source; app/icon.png and app/apple-icon.png are generated from the same
 * file, so the tab icon and the header can never disagree.
 *
 * `withWordmark` swaps in the icon+"Terrion" lockup exported from the brand
 * file instead of the icon alone -- it's an image, not code-set type, so the
 * wordmark's own typeface renders instead of the site's UI font.
 *
 * `priority` on the header instance: the logo is above the fold on every page
 * and a late-loading mark makes the whole shell look like it is still booting.
 */
export function Logo({
  size = 28,
  withWordmark = true,
  className,
}: {
  size?: number
  withWordmark?: boolean
  className?: string
}) {
  if (withWordmark) {
    return (
      <Image
        src="/brand/logo-terion.png"
        alt="Terrion"
        width={Math.round(size * WORDMARK_RATIO)}
        height={size}
        priority
        className={cn('object-contain', className)}
      />
    )
  }

  return (
    <Image
      src="/brand/logo.png"
      alt=""
      width={Math.round(size * MARK_RATIO)}
      height={size}
      priority
      className={cn('rounded-lg object-contain', className)}
    />
  )
}

import Image from 'next/image'

import { cn } from '@/lib/utils'

/**
 * The Terrion mark, in one place.
 *
 * Every header previously inlined its own SVG seedling, which meant four
 * copies to update and four chances for them to drift. This is the single
 * source; app/icon.png and app/apple-icon.png are generated from the same
 * file, so the tab icon and the header can never disagree.
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
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Image
        src="/brand/logo.png"
        alt=""
        width={size}
        height={size}
        priority
        className="rounded-lg object-contain"
      />
      {withWordmark && (
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Terrion
        </span>
      )}
    </span>
  )
}

import Link from 'next/link'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { ShareBar } from '@/components/ui/Sparkbars'
import { commodityStyle } from '@/lib/catalog/commodity-style'
import type { Listing } from '@/lib/catalog/listings'
import { formatNumberId } from '@/lib/format/number'

/**
 * One catalogue entry.
 *
 * What a buyer is deciding between is: which crop, how much, and which week.
 * So those three are the only things given any weight, and everything else on
 * the card is a caption.
 *
 * THE MARK. `commodityStyle` gives every crop a hue and a glyph, and says in
 * its own header that the glyph is a second channel because "colour alone is
 * not an identifier for a reader who cannot distinguish two of these hues".
 * That system spent a while reduced to a four-pixel stripe along the card's
 * top edge — present, but too small to identify anything and impossible to
 * pick out of a grid at a glance. It is a 40px mark now: the crop's tint, the
 * crop's glyph, at the head of the row like the thumbnail on any row of goods.
 *
 * The stripe is gone with it. The mark carries both channels; keeping the
 * stripe as well would be the same fact said twice.
 *
 * THE BAR. A tonnage is hard to place until you can see it against the others
 * on screen — 18 tonnes means nothing until you know the biggest offer here is
 * 32. `max` is the heaviest listing in the current result set, so the bar
 * re-scales as the buyer filters, which is exactly when the comparison
 * matters.
 *
 * No hover lift. Forty cards that each rise towards the pointer is forty
 * invitations competing at once; the rule darkens and the name underlines,
 * which is what tells a reader this is the thing they would be clicking.
 *
 * The "Perkiraan awal" flag is not drawn here. <HarvestWindow> owns it, as it
 * owns every rendering of a harvest date in this codebase, so the catalogue
 * cannot drift from the dashboard about how certain a week is.
 */
export function ListingCard({
  listing,
  max,
}: {
  listing: Listing
  /** The heaviest listing currently shown, for the share bar. */
  max: number
}) {
  const style = commodityStyle(listing.commodityName)

  return (
    <Link
      href={`/catalog/${listing.id}`}
      className="interactive group flex flex-col rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-xs)] hover:border-[var(--terrion-green-200)] hover:shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-md"
          style={{ background: style.tint }}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke={style.hue}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={style.glyph} />
          </svg>
        </span>

        <span className="min-w-0 flex-1">
          <h3 className="truncate text-[0.9375rem] font-semibold text-foreground underline-offset-4 group-hover:underline">
            {listing.commodityName}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {listing.varietyName ?? 'Varietas standar'}
          </p>
        </span>
      </div>

      <p className="mt-4 flex items-baseline gap-1.5">
        <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums text-foreground">
          {formatNumberId(listing.tonnes)}
        </span>
        <span className="text-xs text-muted-foreground">ton diproyeksikan</span>
      </p>

      <ShareBar value={listing.tonnes} max={max} colour={style.hue} className="mt-2.5" />

      <div className="mt-3">
        <HarvestWindow
          size="sm"
          week={{ start: listing.weekStart, end: listing.weekEnd, basis: listing.basis }}
        />
      </div>

      <p className="mt-auto truncate border-t border-border pt-3 text-xs text-muted-foreground">
        {listing.cooperativeName} · {listing.district}
      </p>
    </Link>
  )
}

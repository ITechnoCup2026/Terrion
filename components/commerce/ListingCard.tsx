import Link from 'next/link'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { commodityStyle } from '@/lib/catalog/commodity-style'
import type { Listing } from '@/lib/catalog/listings'
import { formatNumberId } from '@/lib/format/number'

/**
 * One catalogue entry.
 *
 * What a buyer is deciding between is: which crop, how much, and which week.
 * So those three are the only things given any weight, in that order, and
 * everything else on the card is a caption.
 *
 * The card used to open with a 112px tinted panel holding a 48px outlined
 * glyph, under a gradient, with a status pill floating on top — a quarter of
 * every card spent on an illustration that carried no information the heading
 * did not. The crop's identity survives as the band across the top edge, which
 * is the same device the plot list uses for the same purpose, so a colour
 * learned on one screen means the same thing on the other.
 *
 * No hover lift. Forty cards that each rise towards the pointer is forty
 * invitations competing at once; the rule darkens and the name underlines,
 * which is what tells a reader this is the thing they would be clicking.
 *
 * The "Perkiraan awal" flag is not drawn here. <HarvestWindow> owns it, as it
 * owns every rendering of a harvest date in this codebase, so the catalogue
 * cannot drift from the dashboard about how certain a week is.
 *
 * No staggered entrance either. Forty cards fading up on a 40ms ladder is a
 * second and a half during which the reader cannot read the grid they asked
 * for, spent announcing that the grid has arrived.
 */
export function ListingCard({ listing }: { listing: Listing }) {
  const style = commodityStyle(listing.commodityName)

  return (
    <Link
      href={`/catalog/${listing.id}`}
      className="interactive group flex flex-col overflow-hidden rounded-lg border border-border bg-card hover:border-input"
    >
      <span aria-hidden className="h-1 w-full shrink-0" style={{ background: style.hue }} />

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[0.9375rem] font-medium text-foreground underline-offset-4 group-hover:underline">
          {listing.commodityName}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {listing.varietyName ?? 'Varietas standar'}
        </p>

        <p className="mt-4 flex items-baseline gap-1.5">
          <span className="text-2xl leading-none font-medium tracking-tight tabular-nums text-foreground">
            {formatNumberId(listing.tonnes)}
          </span>
          <span className="text-xs text-muted-foreground">ton diproyeksikan</span>
        </p>

        <div className="mt-3">
          <HarvestWindow
            size="sm"
            week={{ start: listing.weekStart, end: listing.weekEnd, basis: listing.basis }}
          />
        </div>

        <p className="mt-auto truncate border-t border-border pt-3 text-xs text-muted-foreground">
          {listing.cooperativeName} · {listing.district}
        </p>
      </div>
    </Link>
  )
}

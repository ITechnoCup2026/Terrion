import Link from 'next/link'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { commodityStyle } from '@/lib/catalog/commodity-style'
import type { Listing } from '@/lib/catalog/listings'
import { formatNumberId } from '@/lib/format/number'

/**
 * One catalogue entry, as a storefront card.
 *
 * The layout borrows from a marketplace grid because the buyer's job here is
 * the same one: scan many, compare a number, pick one. What it does not borrow
 * is the photograph. Listings are derived rather than stored, so there is
 * nothing real to photograph, and a stock image of a rice field would be the
 * only thing on the card that was not measured.
 *
 * The crop's colour block does the scanning work a photo normally would, and
 * the tonnage is the largest thing on the card because it is what a buyer
 * actually filters on.
 */
export function ListingCard({ listing, index = 0 }: { listing: Listing; index?: number }) {
  const style = commodityStyle(listing.commodityName)

  return (
    <Link
      href={`/catalog/${listing.id}`}
      className="rise interactive card-lift group flex flex-col overflow-hidden rounded-xl border border-border bg-card hover:border-foreground/15"
      style={{ ['--rise-delay' as string]: `${Math.min(index, 11) * 45}ms` }}
    >
      {/* The crop's own colour, standing in for a product shot. The glyph is a
          second channel so the identity does not rest on hue alone. */}
      <div
        className="relative flex h-24 items-center justify-center overflow-hidden"
        style={{ backgroundColor: style.tint }}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-11 transition-transform duration-500 group-hover:scale-110"
          fill="none"
          stroke={style.hue}
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={style.glyph} />
        </svg>

        {listing.basis === 'climatology' && (
          <span className="absolute top-2 right-2 rounded-full bg-background/85 px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground backdrop-blur-sm">
            Perkiraan awal
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {listing.commodityName}
          </h3>
          {listing.varietyName && (
            <p className="text-xs text-muted-foreground">{listing.varietyName}</p>
          )}
        </div>

        {/* The number a buyer is here for, at the size that says so. */}
        <p className="flex items-baseline gap-1">
          <span
            className="font-mono text-2xl font-medium tracking-tight"
            style={{ color: style.hue }}
          >
            {formatNumberId(listing.tonnes)}
          </span>
          <span className="text-sm text-muted-foreground">ton</span>
        </p>

        <HarvestWindow
          size="sm"
          week={{ start: listing.weekStart, end: listing.weekEnd, basis: listing.basis }}
        />

        <div className="mt-auto flex items-center gap-2 border-t border-border pt-2.5 text-xs text-muted-foreground">
          <svg aria-hidden viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M12 21s-7-5.4-7-10a7 7 0 1 1 14 0c0 4.6-7 10-7 10Z" strokeLinejoin="round" />
            <circle cx="12" cy="11" r="2.4" />
          </svg>
          <span className="truncate">
            {listing.cooperativeName} · {listing.district}
          </span>

          {/* The card's whole surface is the link; this arrow just makes that
              affordance visible instead of leaving it implicit in the cursor. */}
          <svg
            aria-hidden viewBox="0 0 24 24"
            className="ml-auto size-3.5 shrink-0 -translate-x-1 text-muted-foreground/0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-foreground"
            fill="none" stroke="currentColor" strokeWidth="1.75"
          >
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </Link>
  )
}

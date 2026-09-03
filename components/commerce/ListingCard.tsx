import Link from 'next/link'
import { ArrowRight, Store } from 'lucide-react'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { ShareBar } from '@/components/ui/Sparkbars'
import { commodityStyle } from '@/lib/catalog/commodity-style'
import type { Listing } from '@/lib/catalog/listings'
import { formatNumberId } from '@/lib/format/number'

/**
 * One marketplace product card.
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
      className="interactive group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--terrion-green-300)] hover:shadow-[0_12px_28px_rgba(7,49,36,0.08)]"
    >
      <div>
        {/* Top bar: Category Icon + Title */}
        <div className="flex items-center gap-3 mb-3.5">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-2xs border border-border/40"
            style={{ background: style.tint }}
          >
            {style.image ? (
              <img
                src={style.image}
                alt={listing.commodityName}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="size-5.5"
                fill="none"
                stroke={style.hue}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={style.glyph} />
              </svg>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[0.9375rem] font-bold text-foreground group-hover:text-[var(--terrion-green-700)] transition-colors">
              {listing.commodityName}
            </h3>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {listing.varietyName ?? 'Varietas standar'}
            </p>
          </div>
        </div>

        {/* Tonnage / Volume Box */}
        <div className="rounded-xl bg-[var(--terrion-green-50)]/70 p-3 border border-[var(--terrion-green-200)]/60">
          <div className="flex items-baseline justify-between">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
              Proyeksi Pasokan
            </span>
            <span className="text-xs font-mono font-bold text-[var(--terrion-green-700)]">
              {formatNumberId(listing.tonnes)} ton
            </span>
          </div>
          <ShareBar value={listing.tonnes} max={max} colour={style.hue} className="mt-1.5" />
        </div>

        {/* Harvest Window Box */}
        <div className="mt-3 rounded-xl bg-muted/40 p-3 border border-border/60">
          <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Perkiraan Panen
          </span>
          <HarvestWindow
            size="sm"
            week={{ start: listing.weekStart, end: listing.weekEnd, basis: listing.basis }}
          />
        </div>
      </div>

      {/* Footer: Seller info + CTA button */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 truncate text-muted-foreground min-w-0">
          <Store className="size-3.5 shrink-0 text-[var(--terrion-green-600)]" />
          <span className="truncate font-medium text-foreground">{listing.cooperativeName}</span>
        </span>

        <span className="pill interactive shrink-0 bg-[var(--terrion-green-700)] text-white px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-wider hover:bg-[var(--terrion-green-900)] transition-all flex items-center gap-1 group-hover:translate-x-0.5">
          Detail
          <ArrowRight className="size-3" />
        </span>
      </div>
    </Link>
  )
}


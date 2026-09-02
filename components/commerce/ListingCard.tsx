import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { commodityStyle } from '@/lib/catalog/commodity-style'
import type { Listing } from '@/lib/catalog/listings'
import { formatNumberId } from '@/lib/format/number'

/**
 * One catalogue entry, as a storefront card for buyers.
 */
export function ListingCard({ listing, index = 0 }: { listing: Listing; index?: number }) {
  const style = commodityStyle(listing.commodityName)

  return (
    <Link
      href={`/catalog/${listing.id}`}
      className="rise interactive group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
      style={{ ['--rise-delay' as string]: `${Math.min(index, 11) * 45}ms` }}
    >
      {/* The crop's own colour & icon block */}
      <div
        className="relative flex h-28 items-center justify-center overflow-hidden transition-colors"
        style={{ backgroundColor: style.tint }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />

        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-12 transition-transform duration-500 group-hover:scale-110"
          fill="none"
          stroke={style.hue}
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={style.glyph} />
        </svg>

        {listing.basis === 'climatology' ? (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-background/90 px-2.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground shadow-xs backdrop-blur-md">
            Perkiraan awal
          </span>
        ) : (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[0.65rem] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-700/40 backdrop-blur-md">
            Panen Terverifikasi
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {listing.commodityName}
          </h3>
          {listing.varietyName ? (
            <p className="text-xs font-medium text-muted-foreground">{listing.varietyName}</p>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic">Varietas standar</p>
          )}
        </div>

        {/* Tonnage metric display */}
        <div className="flex items-baseline justify-between rounded-xl bg-muted/40 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Proyeksi Pasokan</span>
          <p className="flex items-baseline gap-1">
            <span
              className="font-mono text-2xl font-bold tracking-tight"
              style={{ color: style.hue }}
            >
              {formatNumberId(listing.tonnes)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">ton</span>
          </p>
        </div>

        <HarvestWindow
          size="sm"
          week={{ start: listing.weekStart, end: listing.weekEnd, basis: listing.basis }}
        />

        <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground/80" />
            <span className="truncate font-medium text-foreground/90">
              {listing.cooperativeName} · {listing.district}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[0.7rem] font-semibold text-primary opacity-90 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 shrink-0 ml-2">
            <span>Ajukan</span>
            <ArrowRight className="size-3" />
          </div>
        </div>
      </div>
    </Link>
  )
}

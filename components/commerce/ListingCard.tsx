import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Building2, CheckCircle2, MapPin } from 'lucide-react'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { ShareBar } from '@/components/ui/Sparkbars'
import { commodityStyle } from '@/lib/catalog/commodity-style'
import type { Listing } from '@/lib/catalog/listings'
import { formatNumberId } from '@/lib/format/number'

/**
 * Modern B2B Commodity Listing Card for Buyers.
 * Features high-contrast typography, image zoom on hover, cooperative trust signals,
 * capacity indicator, and an interactive CTA prompt.
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
      className="panel group relative flex w-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-xs)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--terrion-green-300)] hover:shadow-xs"
    >
      {/* Visual media container with badges */}
      <div
        className="relative aspect-[16/10] w-full overflow-hidden bg-muted/40"
        style={{ background: style.tint }}
      >
        {style.image ? (
          <Image
            src={style.image}
            alt={listing.commodityName}
            fill
            sizes="(min-width: 1280px) 288px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 group-hover:scale-110"
            fill="none"
            stroke={style.hue}
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.75"
          >
            <path d={style.glyph} />
          </svg>
        )}

        {/* Top Badges overlay */}
        <div className="absolute inset-x-2.5 top-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
          {listing.varietyName ? (
            <span className="inline-flex items-center rounded-full bg-background/85 px-2.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-foreground backdrop-blur-md shadow-xs border border-white/20">
              {listing.varietyName}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-background/85 px-2.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-foreground backdrop-blur-md shadow-xs border border-white/20">
              Varietas Lokal
            </span>
          )}

          <span className="inline-flex items-center rounded-full bg-[var(--terrion-green-900)]/80 px-2 py-0.5 text-[0.6875rem] font-bold text-white backdrop-blur-md shadow-xs">
            {listing.isoWeek.replace('2026-', '')}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-[var(--terrion-green-700)]">
              {listing.commodityName}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Building2 className="size-3 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{listing.cooperativeName}</span>
              <span title="Koperasi Terverifikasi" className="flex shrink-0">
                <CheckCircle2
                  aria-label="Koperasi terverifikasi"
                  className="size-3 text-[var(--terrion-green-600)]"
                />
              </span>
            </p>
          </div>
        </div>

        {/* Tonnage & Harvest Window */}
        <div className="mt-4 rounded-lg bg-muted/40 p-2.5 border border-border/60">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground block">
                Estimasi Pasokan
              </span>
              <span className="text-xl font-bold tabular-nums text-foreground">
                {formatNumberId(listing.tonnes)}
                <span className="ml-1 text-xs font-medium text-muted-foreground">ton</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground block mb-0.5">
                Minggu Panen
              </span>
              <HarvestWindow
                size="sm"
                week={{ start: listing.weekStart, end: listing.weekEnd, basis: listing.basis }}
              />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[0.6875rem] text-muted-foreground mb-1">
              <span>Kapasitas relatif</span>
              <span className="font-medium tabular-nums">
                {max > 0 ? `${Math.round((listing.tonnes / max) * 100)}%` : '100%'}
              </span>
            </div>
            <ShareBar value={listing.tonnes} max={max} colour={style.hue} />
          </div>
        </div>

        {/* Card Footer: Location & Action link */}
        <div className="mt-4 flex items-center justify-between border-t border-border/80 pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 truncate max-w-[65%]">
            <MapPin className="size-3 shrink-0 text-muted-foreground/70" />
            <span className="truncate">{listing.district}, {listing.province}</span>
          </span>

          <span className="inline-flex items-center gap-1 font-semibold text-[var(--terrion-green-700)] transition-transform group-hover:translate-x-0.5">
            Ajukan
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

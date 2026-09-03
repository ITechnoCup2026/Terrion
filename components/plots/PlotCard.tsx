import { User } from 'lucide-react'
import Link from 'next/link'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { CROP_CELL, CROP_STAGES } from '@/lib/canvas/crops'
import { formatNumberId } from '@/lib/format/number'
import { commodityColour } from '@/lib/plots/colour'
import type { PlotSummary } from '@/lib/plots/summary'

export type CommodityRef = { id: string; name: string; spriteRow: number }

/**
 * One plot in the list.
 */
export function PlotCard({
  plot, commodities,
}: {
  plot: PlotSummary
  /** Looked up by id; the list is the cooperative's whole commodity table. */
  commodities: Map<string, CommodityRef>
}) {
  const grown = plot.commodityIds
    .map(id => commodities.get(id))
    .filter((c): c is CommodityRef => c != null)

  const lead = grown[0]
  const stripe = lead ? commodityColour(lead.spriteRow) : 'var(--border)'

  return (
    <Link
      href={`/plots/${plot.id}`}
      className="interactive group relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:border-[var(--terrion-green-700)]/50 hover:shadow-md"
    >
      {/* Top Commodity Accent Stripe */}
      <span aria-hidden className="absolute top-0 inset-x-0 h-1" style={{ background: stripe }} />

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-foreground transition-colors group-hover:text-[var(--terrion-green-900)]">
              {plot.name}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="size-3.5 text-muted-foreground/70 shrink-0" />
              <span className="truncate">{plot.memberName ?? 'Petani tidak tercatat'}</span>
              <span>·</span>
              <span className="font-semibold tabular-nums text-foreground">{formatNumberId(plot.areaHa)} ha</span>
            </div>
          </div>
          {lead && <CropGlyph spriteRow={lead.spriteRow} stage={CROP_STAGES - 2} />}
        </div>

        <div className="my-1">
          {plot.nextWindow ? (
            <HarvestWindow size="sm" window={plot.nextWindow} />
          ) : (
            <span className="inline-flex items-center rounded-md bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
              Belum ada tanaman aktif
            </span>
          )}
        </div>

        {plot.progress != null && plot.progress < 1 && (
          <SeasonMeter progress={plot.progress} colour={stripe} />
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border/60 pt-3 text-xs">
          {grown.length > 0 && (
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <span className="size-2 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: stripe }} />
              <span className="truncate">{grown.map(c => c.name).join(' · ')}</span>
            </div>
          )}
          {plot.expectedTonnes != null && (
            <span className="ml-auto shrink-0 font-semibold tabular-nums text-foreground">
              {plot.blockCount} blok · ± {formatNumberId(plot.expectedTonnes)} t
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

/**
 * One cell of the crop sprite sheet, as a background position.
 */
function CropGlyph({ spriteRow, stage }: { spriteRow: number; stage: number }) {
  const size = CROP_CELL * 2
  return (
    <span
      aria-hidden
      className="shrink-0 rounded-lg border border-border/50 bg-muted/40 p-1 flex items-center justify-center shadow-2xs"
      style={{
        width: size + 8, height: size + 8,
      }}
    >
      <span
        style={{
          width: size, height: size,
          imageRendering: 'pixelated',
          backgroundImage: 'url(/sprites/crops.png)',
          backgroundSize: `${CROP_STAGES * size}px auto`,
          backgroundPosition: `-${stage * size}px -${spriteRow * size}px`,
        }}
      />
    </span>
  )
}

/**
 * How far the soonest block is through the heat its variety needs.
 */
function SeasonMeter({ progress, colour }: { progress: number; colour: string }) {
  const percent = Math.round(progress * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-[0.6875rem] font-medium text-muted-foreground">
        <span>Perkembangan musim</span>
        <span className="tabular-nums font-semibold text-foreground">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percent}%`, background: colour }}
        />
      </div>
    </div>
  )
}

import Link from 'next/link'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { CROP_CELL, CROP_STAGES } from '@/lib/canvas/crops'
import { formatNumberId } from '@/lib/format/number'
import { commodityColour } from '@/lib/plots/colour'
import type { PlotSummary } from '@/lib/plots/summary'

export type CommodityRef = { id: string; name: string; spriteRow: number }

/**
 * One plot in the list.
 *
 * The card answers, in order: what is it, whose is it, when does it come out,
 * and how far along is it. The harvest window is the largest thing on it
 * because "when" is the question the whole product exists to answer -- the
 * previous card gave it the same weight as the hectares.
 *
 * The colour stripe and the glyph both come from the commodity, so a kader
 * scanning thirty cards recognises the crop before reading a word. They are
 * the same colours the farm canvas outlines blocks with.
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
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border
        bg-card shadow-[var(--shadow-xs)] transition-all
        hover:-translate-y-0.5 hover:border-input hover:shadow-[var(--shadow-md)]"
    >
      {/* The commodity, as a band down the leading edge. */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: stripe }} />

      <div className="flex flex-1 flex-col gap-3 p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{plot.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {plot.memberName ?? 'Petani tidak tercatat'} · {formatNumberId(plot.areaHa)} ha
            </p>
          </div>
          {lead && <CropGlyph spriteRow={lead.spriteRow} stage={CROP_STAGES - 2} />}
        </div>

        <div>
          {plot.nextWindow ? (
            <HarvestWindow size="sm" window={plot.nextWindow} />
          ) : (
            // Registered land with nothing growing on it is a real state, and
            // saying so beats printing a date nobody predicted.
            <span className="text-[0.8rem] text-muted-foreground">Belum ada tanaman aktif</span>
          )}
        </div>

        {/* Only while it is still growing. A bar pinned at 100% says nothing
            the harvest window above it has not already said, and every crop
            past its heat requirement would show one. */}
        {plot.progress != null && plot.progress < 1 && (
          <SeasonMeter progress={plot.progress} colour={stripe} />
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-muted-foreground">
          {grown.length > 0 && (
            <span className="truncate">{grown.map(c => c.name).join(' · ')}</span>
          )}
          {plot.expectedTonnes != null && (
            <span className="ml-auto shrink-0">
              {plot.blockCount} blok · ± {formatNumberId(plot.expectedTonnes)} ton
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

/**
 * One cell of the crop sprite sheet, as a background position.
 *
 * The sheet is already served for the canvas, so this costs no extra request.
 * Rendered at 2x with crisp-edges: a 32px pixel-art tile scaled smoothly turns
 * to mush.
 */
function CropGlyph({ spriteRow, stage }: { spriteRow: number; stage: number }) {
  const size = CROP_CELL * 2
  return (
    <span
      aria-hidden
      className="shrink-0 rounded-md bg-muted/60"
      style={{
        width: size, height: size,
        imageRendering: 'pixelated',
        backgroundImage: 'url(/sprites/crops.png)',
        backgroundSize: `${CROP_STAGES * size}px auto`,
        backgroundPosition: `-${stage * size}px -${spriteRow * size}px`,
      }}
    />
  )
}

/**
 * How far the soonest block is through the heat its variety needs.
 *
 * Shown only while that is under way -- see the caller.
 *
 * Not a countdown in days: the model works in accumulated degree-days, and a
 * cold fortnight really does move the harvest. Showing the ratio the model
 * uses is honest; converting it to "12 hari lagi" would invent precision.
 */
function SeasonMeter({ progress, colour }: { progress: number; colour: string }) {
  const percent = Math.round(progress * 100)
  return (
    <div>
      <div className="flex items-baseline justify-between text-[0.7rem] text-muted-foreground">
        <span>Perkembangan musim</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${percent}%`, background: colour }}
        />
      </div>
    </div>
  )
}

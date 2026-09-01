'use client'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { Button } from '@/components/ui/button'
import { phaseLabel, phaseNote, phaseProgress } from '@/lib/agronomy/phase'
import { formatNumberId } from '@/lib/format/number'
import type { StageBlock } from './PlotStage'

/**
 * One square of ground, opened by tapping it on the diagram.
 *
 * The block panel answers "what is planted here"; this answers "what am I
 * looking at", which is the question a neighbour or a buyer reading a shared
 * link actually has. The diagram already draws a crop at a growth stage on
 * every tile, and until now tapping one could only tell you which block it
 * belonged to — the picture was more specific than the words.
 *
 * WHAT THIS MAY AND MAY NOT SAY
 *
 * Everything here is either recorded or divided. The position and the tile's
 * area come from the layout, the planting date and phase from the block, the
 * harvest window from the model. The yield figure is the block's predicted
 * range split evenly across its tiles, and it says so — the model predicts a
 * block, never a plant, and a per-tile number that did not admit to being an
 * average would be a figure nothing in the pipeline produced.
 *
 * Deliberately absent: plant height, and a per-plant confidence. Both would
 * have to be invented, and neither is something the backend has ever measured.
 *
 * Contents only; AnchoredPanel owns the frame and the position.
 */
export function PlantDetailPanel({
  block, tileSizeM2, ordinal, tileCount, degraded, onClose,
}: {
  block: StageBlock
  /** How much ground one square stands for. The honest unit of this panel. */
  tileSizeM2: number
  /** Which square within its block, counting from one, for "ubin ke-N". */
  ordinal: number
  tileCount: number
  degraded: boolean
  onClose: () => void
}) {
  const stage = block.stage
  const share = block.yieldRangeTonnes

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{block.commodityName}</p>
          <p className="text-xs text-muted-foreground">
            Ubin ke-{ordinal} dari {tileCount} · {block.label}
          </p>
        </div>
        <Button variant="ghost" size="xs" onClick={onClose} aria-label="Tutup">✕</Button>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-foreground">{phaseLabel(stage)}</p>
          <p className="text-xs text-muted-foreground">Fase {stage + 1} dari 5</p>
        </div>
        {/* Five rungs, drawn as five segments rather than one filled bar: a
            continuous bar would imply we know where between two phases the
            crop sits, and the sprite ladder has no such resolution. */}
        <div className="mt-1.5 flex gap-1" aria-hidden>
          {[0, 1, 2, 3, 4].map(i => (
            <span
              key={i}
              className={
                i <= stage
                  ? 'h-1.5 flex-1 rounded-full bg-primary'
                  : 'h-1.5 flex-1 rounded-full bg-muted'
              }
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {phaseNote(stage)}
        </p>
      </div>

      <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
        {block.varietyName && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Varietas</dt>
            <dd className="text-right text-foreground">{block.varietyName}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Luas satu ubin</dt>
          <dd className="text-foreground tabular-nums">
            {formatNumberId(Math.round(tileSizeM2))} m²
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Ditanam</dt>
          <dd className="text-foreground">{block.plantingDateLabel}</dd>
        </div>
      </dl>

      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-1 text-xs text-muted-foreground">Perkiraan panen blok ini</p>
        <HarvestWindow window={block.window} degraded={degraded} size="sm" />
      </div>

      {share && tileCount > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">Bagian ubin ini</p>
          <p className="text-sm font-medium tabular-nums text-foreground">
            {formatNumberId((share.min * 1000) / tileCount)}–
            {formatNumberId((share.max * 1000) / tileCount)} kg
          </p>
          {/* The sentence this panel exists to be able to say. */}
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Perkiraan dibuat untuk seluruh blok, lalu dibagi rata ke {tileCount} ubin.
            Hasil tiap ubin di lapangan tidak pernah sama rata.
          </p>
        </div>
      )}
    </>
  )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { PlotCanvas } from '@/components/canvas/PlotCanvas'
import { FRAME_TILES_DESKTOP, FRAME_TILES_MOBILE, frameFarm } from '@/lib/canvas/frame'
import { scaleStep } from '@/lib/canvas/view'
import { TimeSlider } from '@/components/canvas/TimeSlider'
import { AnchoredPanel } from '@/components/ui/AnchoredPanel'
import type { Point } from '@/lib/ui/anchor'
import { loadCrops } from '@/lib/canvas/crops'
import type { BlockStyle } from '@/lib/canvas/renderer'
import { loadTerrainSheets, type TerrainSheets } from '@/lib/canvas/sheets'
import { stageOn, timelineBounds } from '@/lib/canvas/timeline'
import { generateTerrain } from '@/lib/terrain/generate'
import type { HarvestWindow as HarvestWindowData } from '@/lib/agronomy/types'
import { allocateTiles } from '@/lib/tilegrid/allocate'
import { BlockDetailPanel } from './BlockDetailPanel'
import type { ReferenceCommodity, ReferenceVariety } from './SplitBlockForm'
import { FarmSummaryPanel, type FarmSummary } from './FarmSummaryPanel'

export type StageBlock = {
  id: string
  areaHa: number
  orderIndex: number
  label: string
  color: string
  spriteRow: number
  /** From the prediction, so the sprite shows how grown the crop really is. */
  stage: number
  commodityName: string
  plantingDateLabel: string
  window: HarvestWindowData | null
  /** Planting date and GDD requirement, so the slider can resolve any date
   *  in the browser without asking the server. */
  plantingDate: string
  gddRequired: number
}

const MOBILE_MAX_PX = 640

/** One tile, in canvas pixels. Passed to the canvas explicitly rather than
 *  left to its default, because the framing maths here has to agree with it. */
const CELL_PX = 32

/** What the reader has open: one block, the farmhouse, or nothing. */
type Selection =
  | { kind: 'block'; blockId: string; at: Point }
  | { kind: 'house'; at: Point }
  | null

// Client wrapper around the canvas: the page computes blocks on the server,
// this owns the sprite sheets, the generated scenery and the open panel.
export function PlotStage({
  plotAreaHa, blocks, terrainSeed, summary, degraded, variant = 'full', editing,
}: {
  plotAreaHa: number
  blocks: StageBlock[]
  terrainSeed: number
  /** Absent on the public page: the roll-up is internal, and the link it
   *  offers points back at the page the reader is already on. */
  summary?: FarmSummary
  degraded: boolean
  /** How the stage is sized.
   *
   *  'full' fills its parent, for the plot page, where the farm is the screen.
   *
   *  'card' is a self-sizing card, for the public garden page, where the farm
   *  sits in a column of text. That page had no variant and got 'full', whose
   *  h-full resolved against an auto-height parent -- so the canvas fell back
   *  to its intrinsic 150px and the farm rendered as a strip. */
  variant?: 'full' | 'card'
  /** The reference lists the split form needs, passed only when the viewer is
   *  allowed to write. Absent on the public garden page, which is why that
   *  page never ships a commodity list to the browser. */
  editing?: {
    commodities: ReferenceCommodity[]
    varieties: ReferenceVariety[]
  }
}) {
  // One selection, not two booleans: a block and the farmhouse are alternative
  // answers to the same click, so "opening one closes the other" is a property
  // of the state rather than a rule two setters have to remember.
  const [selection, setSelection] = useState<Selection>(null)
  const [crops, setCrops] = useState<HTMLImageElement | null>(null)
  const [sheets, setSheets] = useState<TerrainSheets | null>(null)
  // How big the stage actually is, measured. The scenery is generated to cover
  // it, so the world cannot be sized until the box is.
  const stageRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ width: number; height: number } | null>(null)
  const [margin, setMargin] = useState(FRAME_TILES_DESKTOP)
  // null means today. Set only by dragging the slider.
  const [viewDate, setViewDate] = useState<Date | null>(null)

  // Both loaders resolve to null rather than rejecting, so a missing sheet
  // leaves the canvas drawing its clean grid instead of throwing mid-render.
  useEffect(() => {
    let alive = true
    loadCrops().then(img => { if (alive) setCrops(img) })
    loadTerrainSheets().then(s => { if (alive) setSheets(s) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`)
    const apply = () => setMargin(query.matches ? FRAME_TILES_MOBILE : FRAME_TILES_DESKTOP)
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  // Rounded, so a one-pixel resize does not regenerate the whole landscape.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const apply = () => setBox(prev => {
      const width = Math.round(el.clientWidth)
      const height = Math.round(el.clientHeight)
      if (width === 0 || height === 0) return prev
      return prev && prev.width === width && prev.height === height
        ? prev
        : { width, height }
    })
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const layout = useMemo(
    () => allocateTiles({
      plotAreaHa,
      blocks: blocks.map(({ id, areaHa, orderIndex }) => ({ id, areaHa, orderIndex })),
    }),
    [plotAreaHa, blocks],
  )

  // How much world to make, and where to point the camera. The camera frames
  // the field; the scenery is then generated to cover whatever is left of the
  // screen, so there is no page background showing around the farm.
  const frame = useMemo(
    () => box && frameFarm({
      plotCols: layout.cols,
      plotRows: layout.rows,
      cellPx: CELL_PX,
      width: box.width,
      height: box.height,
      step: scaleStep(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1),
      margin,
    }),
    [box, layout.cols, layout.rows, margin],
  )

  // Same seed, same landscape, forever -- and nothing is stored per cell.
  // Null until the stage has been measured: generating a world for a box of
  // unknown size would only be thrown away a frame later.
  const terrain = useMemo(
    () => frame && generateTerrain(terrainSeed, layout.cols, layout.rows, frame.border),
    [terrainSeed, layout.cols, layout.rows, frame],
  )

  // The span the slider covers. Null when no block carries a series, which is
  // what hides the control -- a track with nothing to scrub would be a lie.
  const bounds = useMemo(
    () => timelineBounds(blocks.map(b => ({
      plantingDate: new Date(b.plantingDate),
      gddRequired: b.gddRequired,
      cumulativeGdd: b.window?.cumulativeGdd ?? [],
    }))),
    [blocks],
  )

  // Stages come from the server for today, and from the series while scrubbing.
  // Recomputing them is a binary search per block, so a drag re-rasterises the
  // crop layer and touches the network not at all.
  const styles = useMemo(
    () => new Map<string, BlockStyle>(blocks.map(b => [b.id, {
      blockId: b.id,
      label: b.label,
      color: b.color,
      spriteRow: b.spriteRow,
      stage: viewDate
        ? stageOn({
            plantingDate: new Date(b.plantingDate),
            gddRequired: b.gddRequired,
            cumulativeGdd: b.window?.cumulativeGdd ?? [],
          }, viewDate)
        : b.stage,
    }])),
    [blocks, viewDate],
  )

  const selectedBlock = selection?.kind === 'block'
    ? blocks.find(b => b.id === selection.blockId) ?? null
    : null

  return (
    <div
      ref={stageRef}
      className={
        variant === 'card'
          ? 'relative aspect-[4/3] max-h-[70vh] w-full overflow-hidden rounded-xl border border-border bg-card'
          : 'relative h-full w-full overflow-hidden'
      }
    >
      <PlotCanvas
        layout={layout}
        styles={styles}
        crops={crops}
        cellPx={CELL_PX}
        terrain={terrain}
        sheets={sheets}
        initialView={frame?.view ?? null}
        onSelectBlock={(blockId, at) =>
          setSelection(blockId && at ? { kind: 'block', blockId, at } : null)}
        selectedBlockId={selectedBlock?.id ?? null}
        onSelectHouse={summary ? at => setSelection({ kind: 'house', at }) : undefined}
      />

      {/* Panels open AT the pointer rather than parked in a corner. A popup in
          the bottom-left describing a tile in the top-right makes the reader
          carry the connection themselves. */}
      {selection?.kind === 'house' && summary && (
        <AnchoredPanel
          point={selection.at}
          label={`Ringkasan ${summary.plotName}`}
          onClose={() => setSelection(null)}
        >
          <FarmSummaryPanel
            summary={summary} degraded={degraded} onClose={() => setSelection(null)}
          />
        </AnchoredPanel>
      )}

      {selection?.kind === 'block' && selectedBlock && (
        <AnchoredPanel
          point={selection.at}
          label={`Rincian ${selectedBlock.label}`}
          onClose={() => setSelection(null)}
        >
          <BlockDetailPanel
            block={selectedBlock} degraded={degraded} editing={editing}
            onClose={() => setSelection(null)}
          />
        </AnchoredPanel>
      )}

      {bounds && (
        <TimeSlider
          bounds={bounds}
          value={viewDate ?? new Date()}
          onChange={setViewDate}
          className="absolute bottom-4 left-1/2 z-20 w-[min(22rem,calc(100%-1.5rem))] -translate-x-1/2"
        />
      )}
    </div>
  )
}

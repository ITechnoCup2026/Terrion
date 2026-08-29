'use client'
import { useMemo, useState } from 'react'
import { PlotCanvas } from '@/components/canvas/PlotCanvas'
import { allocateTiles } from '@/lib/tilegrid/allocate'
import type { BlockStyle } from '@/lib/canvas/renderer'

// Fixed sample plot. Real plots arrive with the Server Action in Task A5.
const PLOT_AREA_HA = 1.4
const BLOCKS = [
  { id: 'a', areaHa: 0.32, orderIndex: 0, label: 'BLOK A · 0,32 ha', color: '#525726', spriteRow: 1, stage: 0 },
  { id: 'b', areaHa: 0.58, orderIndex: 1, label: 'BLOK B · 0,58 ha', color: '#ab5124', spriteRow: 2, stage: 2 },
  { id: 'c', areaHa: 0.5,  orderIndex: 2, label: 'BLOK C · 0,50 ha', color: '#52513d', spriteRow: 3, stage: 4 },
]

export default function DemoPlotPage() {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  const layout = useMemo(
    () => allocateTiles({
      plotAreaHa: PLOT_AREA_HA,
      blocks: BLOCKS.map(({ id, areaHa, orderIndex }) => ({ id, areaHa, orderIndex })),
    }),
    [],
  )

  const styles = useMemo(
    () => new Map<string, BlockStyle>(
      BLOCKS.map(b => [b.id, {
        blockId: b.id, label: b.label, color: b.color, spriteRow: b.spriteRow, stage: b.stage,
      }]),
    ),
    [],
  )

  return (
    <main className="flex h-dvh flex-col gap-3 p-4">
      <header className="text-sm">
        <h1 className="font-medium">Plot demo · {PLOT_AREA_HA} ha</h1>
        <p className="text-muted-foreground">
          {layout.cols}×{layout.rows} grid · {layout.totalTiles} tiles · {layout.tileSizeM2} m² per tile
        </p>
        <p className="text-muted-foreground">
          Drag to pan · wheel to zoom · click a block to select ·{' '}
          <strong>{selectedBlockId ? `selected: ${selectedBlockId}` : 'nothing selected'}</strong>
        </p>
      </header>
      <div className="min-h-0 flex-1 rounded-md border">
        {/* No crop sheet yet — the renderer falls back to coloured rectangles. */}
        <PlotCanvas
          layout={layout}
          styles={styles}
          crops={null}
          onSelectBlock={setSelectedBlockId}
          selectedBlockId={selectedBlockId}
        />
      </div>
    </main>
  )
}

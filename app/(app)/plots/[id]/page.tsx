import { notFound, redirect } from 'next/navigation'

import type { FarmSummary } from '@/components/plots/FarmSummaryPanel'
import { PlotStage, type StageBlock } from '@/components/plots/PlotStage'
import type { ReferenceCommodity, ReferenceVariety } from '@/components/plots/SplitBlockForm'
import { Page, PageHeader } from '@/components/ui/Page'
import { currentAppUser } from '@/lib/auth/session'
import { loadCommodities } from '@/lib/commodities/load'
import { formatDateId } from '@/lib/harvest/format'
import { commodityColour } from '@/lib/plots/colour'
import { loadPlot } from '@/lib/plots/load'

export default async function PlotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await currentAppUser()
  if (!user) redirect('/login')

  const [plot, commodityCatalogue] = await Promise.all([loadPlot(id), loadCommodities()])
  if (!plot) notFound()

  const varietyById = new Map(commodityCatalogue.flatMap(c => c.varieties.map(v => [v.id, v])))

  // Splitting a block is a write, and writes on a block belong to kaders and
  // pengurus. The action re-checks; this decides whether the button is even
  // offered, because a button that always refuses is worse than no button.
  const canEdit = user.role === 'kader' || user.role === 'pengurus'

  const stageBlocks: StageBlock[] = plot.blocks.map(b => ({
    id: b.id,
    areaHa: b.areaHa,
    orderIndex: b.orderIndex,
    label: `${b.label} · ${b.areaHa.toFixed(2)} ha`,
    color: commodityColour(b.spriteRow),
    spriteRow: b.spriteRow,
    stage: b.window?.stage ?? 0,
    commodityName: b.commodityName,
    plantingDateLabel: formatDateId(b.plantingDate),
    window: b.window,
    plantingDate: b.plantingDate.toISOString().slice(0, 10),
    gddRequired: b.window?.gddRequired ?? 0,
  }))

  // What the farmhouse popup shows: the totals the per-block panel does not.
  // Tonnage is a range because every variety publishes a range; collapsing it
  // to one number would put the only unmeasured figure on the screen.
  const starts = plot.blocks.map(b => b.window?.start).filter((d): d is Date => Boolean(d))
  const ends = plot.blocks.map(b => b.window?.end).filter((d): d is Date => Boolean(d))

  const summary: FarmSummary = {
    plotName: plot.name,
    memberName: plot.memberName || 'Petani tidak tercatat',
    areaHa: plot.areaHa,
    blockCount: plot.blocks.length,
    commodities: [...new Set(plot.blocks.map(b => b.commodityName))],
    publicId: plot.publicId,
    tonnesMin: plot.blocks.reduce((sum, b) => {
      const v = varietyById.get(b.varietyId)
      return sum + (v ? v.yieldPerHaMin * b.areaHa : 0)
    }, 0),
    tonnesMax: plot.blocks.reduce((sum, b) => {
      const v = varietyById.get(b.varietyId)
      return sum + (v ? v.yieldPerHaMax * b.areaHa : 0)
    }, 0),
    window: starts.length > 0 && ends.length > 0
      ? {
          start: new Date(Math.min(...starts.map(d => d.getTime()))),
          end: new Date(Math.max(...ends.map(d => d.getTime()))),
          basis: plot.blocks.some(b => b.window && b.window.basis !== 'observed')
            ? 'climatology' : 'observed',
        }
      : null,
  }

  const editingCommodities: ReferenceCommodity[] = commodityCatalogue.map(c => ({
    id: c.id, name: c.name,
  }))
  const editingVarieties: ReferenceVariety[] = commodityCatalogue.flatMap(c =>
    c.varieties.map(v => ({ id: v.id, commodity_id: v.commodityId, name: v.name })))

  return (
    // Full-bleed: the farm IS the screen. AppShell puts this route in its
    // immersive frame, so this fills the viewport exactly and nothing above it
    // adds padding or a scrollbar.
    <main className="relative h-full w-full overflow-hidden">
      {stageBlocks.length > 0 ? (
        <>
          <PlotStage
            plotAreaHa={plot.areaHa}
            blocks={stageBlocks}
            terrainSeed={plot.terrainSeed}
            summary={summary}
            degraded={plot.degraded}
            editing={canEdit
              ? { commodities: editingCommodities, varieties: editingVarieties }
              : undefined}
          />

          {/* A card, not a bar with a gradient under it. The gradient was there
              to keep the title legible over the canvas, but it dimmed the top
              of the farm to do it -- which is the part of the picture the eye
              lands on first. A card carries its own background instead.

              Top-centre on a wide screen, because the shell's own cards hold
              the two top corners; below them on a narrow one. */}
          <header className="absolute inset-x-3 top-16 z-30 w-fit max-w-[calc(100%-1.5rem)] rounded-lg border border-border bg-background px-3 py-2 shadow-[var(--shadow-md)] md:inset-x-auto md:top-3 md:left-1/2 md:-translate-x-1/2">
            <h1 className="text-sm font-semibold text-foreground">{plot.name}</h1>
            <p className="text-xs text-muted-foreground">
              {plot.areaHa.toFixed(2)} ha · {stageBlocks.length} blok ·
              kode publik {plot.publicId}
            </p>
          </header>
        </>
      ) : (
        <Page className="flex flex-col gap-4">
          <PageHeader
            title={plot.name}
            description={`${plot.areaHa.toFixed(2)} ha · kode publik ${plot.publicId}`}
          />
          <p className="text-sm text-muted-foreground">
            {plot.hasHarvestedBlocks
              ? 'Belum ada tanaman aktif — seluruh musim di lahan ini sudah dipanen.'
              : 'Lahan ini belum punya blok.'}
          </p>
        </Page>
      )}
    </main>
  )
}

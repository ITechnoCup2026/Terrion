import { notFound } from 'next/navigation'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { PlotNeighbours } from '@/components/plots/PlotNeighbours'
import { PlotStage, type StageBlock } from '@/components/plots/PlotStage'
import { ShareLink } from '@/components/plots/ShareLink'
import { formatNumberId } from '@/lib/format/number'
import { MONTHS_ID } from '@/lib/harvest/format'
import { loadCooperativePlots, loadPublicPlot } from '@/lib/plots/public-load'
import { neighboursOf } from '@/lib/plots/siblings'

// Indexed by commodity.sprite_row, matching the crop sheet's row order.
const BLOCK_COLOURS = ['#52513d', '#525726', '#ab5124', '#7a6a3a', '#8a4b2f', '#6b5b95', '#a33d5e']

export const revalidate = 3600

// A planting date, read in UTC like every other date in the app.
function plantedOn(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ public_id: string }>
}) {
  const { public_id } = await params
  const plot = await loadPublicPlot(public_id)
  if (!plot) return { title: 'Lahan tidak ditemukan' }

  return {
    title: `${plot.name} · ${plot.memberName}`,
    description:
      `${formatNumberId(plot.areaHa)} ha di ${plot.village}, ${plot.district}. ` +
      'Perkiraan panen dihitung dari cuaca yang tercatat.',
  }
}

export default async function GardenPage({
  params,
}: {
  params: Promise<{ public_id: string }>
}) {
  const { public_id } = await params
  const plot = await loadPublicPlot(public_id)
  if (!plot) notFound()

  // The rest of this cooperative's public land, so the page is not a leaf.
  // Loaded after the plot rather than beside it, because it needs the village
  // and district the plot carries.
  const { cooperativeName, plots } = await loadCooperativePlots(plot.village, plot.district)
  const neighbours = neighboursOf(plots, plot.publicId)

  const stageBlocks: StageBlock[] = plot.blocks.map(b => ({
    id: b.id,
    areaHa: b.areaHa,
    orderIndex: b.orderIndex,
    label: `${b.label} · ${formatNumberId(b.areaHa, 2)} ha`,
    color: BLOCK_COLOURS[b.spriteRow % BLOCK_COLOURS.length],
    spriteRow: b.spriteRow,
    stage: b.window?.stage ?? 0,
    commodityName: b.commodityName,
    plantingDateLabel: plantedOn(b.plantingDate),
    // Without the daily GDD series. It crosses to the browser here, and this
    // page is built for a phone on a village connection -- the panel renders a
    // range, which needs the dates and nothing else. The signed-in plot page
    // keeps the series, because the time slider resolves stages from it.
    window: b.window ? { ...b.window, cumulativeGdd: [] } : null,
    // No series here, so timelineBounds returns null and the time slider does
    // not appear. That is deliberate rather than incidental: a scrubber would
    // be a pleasure on this page, but it costs the daily GDD series per block
    // in the payload, and this page is for a phone on a village connection.
    plantingDate: b.plantingDate.toISOString().slice(0, 10),
    gddRequired: 0,
  }))

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground">{plot.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {plot.memberName && `${plot.memberName} · `}
        {formatNumberId(plot.areaHa)} ha di {plot.village}, {plot.district}
      </p>

      {stageBlocks.length > 0 && (
        <div className="mt-4">
          <PlotStage
            plotAreaHa={plot.areaHa}
            blocks={stageBlocks}
            terrainSeed={plot.terrainSeed}
            degraded={plot.degraded}
            variant="card"
          />
          {/* The tile grid is a diagram, never a map. Saying so is the whole
              reason this project can show a plot at all without claiming to
              know where its boundaries are. */}
          <p className="mt-2 text-xs text-muted-foreground">
            Diagram lahan — ukuran blok sebanding dengan luasnya, bukan peta lokasi.
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-3">
        {plot.blocks.map(b => (
          <div key={b.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-sm font-semibold text-foreground">
                {b.commodityName}
                {b.varietyName && (
                  <span className="font-normal text-muted-foreground"> — {b.varietyName}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNumberId(b.areaHa, 2)} ha
              </p>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Ditanam {plantedOn(b.plantingDate)}
            </p>

            <div className="mt-2">
              <HarvestWindow window={b.window} degraded={plot.degraded} size="sm" />
            </div>

            {b.yieldRangeTonnes && (
              <p className="mt-1 text-xs text-muted-foreground">
                Perkiraan hasil {formatNumberId(b.yieldRangeTonnes.min)}–
                {formatNumberId(b.yieldRangeTonnes.max)} ton
                <span className="text-muted-foreground/70"> · rentang varietas</span>
              </p>
            )}
          </div>
        ))}
      </div>

      {plot.blocks.length === 0 && (
        <p className="mt-5 text-sm text-muted-foreground">
          Tidak ada tanaman yang sedang tumbuh di lahan ini saat ini.
        </p>
      )}

      <div className="mt-6">
        <ShareLink title={`${plot.name} — ${plot.memberName}`} />
      </div>

      <PlotNeighbours
        neighbours={neighbours}
        cooperativeName={cooperativeName}
        village={plot.village}
      />

      <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
        Halaman ini dibagikan oleh koperasi. Perkiraan panen dihitung dari cuaca
        yang tercatat dan dapat berubah. Terrion adalah penyedia sistem.
      </p>
    </div>
  )
}

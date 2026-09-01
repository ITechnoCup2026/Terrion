import Link from 'next/link'
import { notFound } from 'next/navigation'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { HarvestGantt, type GanttRow } from '@/components/plots/HarvestGantt'
import { PlotNeighbours } from '@/components/plots/PlotNeighbours'
import { PlotStage, type StageBlock } from '@/components/plots/PlotStage'
import { ShareLink } from '@/components/plots/ShareLink'
import { Card, MetricRow } from '@/components/ui/Card'
import { Page, PageHeader, SectionHeading } from '@/components/ui/Page'
import { phaseLabel } from '@/lib/agronomy/phase'
import { formatNumberId } from '@/lib/format/number'
import { MONTHS_ID } from '@/lib/harvest/format'
import { loadPublicPlot, type PublicBlock } from '@/lib/plots/public-load'

// Indexed by commodity.sprite_row, matching the crop sheet's row order.
const BLOCK_COLOURS = ['#52513d', '#525726', '#ab5124', '#7a6a3a', '#8a4b2f', '#6b5b95', '#a33d5e']

export const revalidate = 3600

// A planting date, read in UTC like every other date in the app.
function plantedOn(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function colourFor(spriteRow: number): string {
  return BLOCK_COLOURS[spriteRow % BLOCK_COLOURS.length]
}

/**
 * The commodity holding the most ground, and how much of the plot that is.
 *
 * Named "utama" rather than "satu-satunya": a plot with three crops has a
 * largest one, and the share beside it is what stops that reading as "this
 * plot grows maize" when maize is a third of it.
 */
function leadCommodity(blocks: PublicBlock[]): { name: string; sharePct: number } | null {
  if (blocks.length === 0) return null
  const byName = new Map<string, number>()
  for (const b of blocks) byName.set(b.commodityName, (byName.get(b.commodityName) ?? 0) + b.areaHa)
  const total = [...byName.values()].reduce((s, a) => s + a, 0)
  const [name, area] = [...byName.entries()].sort((a, b) => b[1] - a[1])[0]
  return { name, sharePct: total > 0 ? (area / total) * 100 : 0 }
}

/**
 * The plot's whole expected harvest, added up.
 *
 * Only over the blocks that have a range. A block whose variety row carries no
 * yield figures contributes nothing and is counted separately, so the total can
 * say what it is a total OF -- silently summing four blocks and printing the
 * figure as if it covered six is the failure this returns `missing` to avoid.
 */
function totalYield(blocks: PublicBlock[]): { min: number; max: number; missing: number } | null {
  let min = 0
  let max = 0
  let counted = 0
  for (const b of blocks) {
    if (!b.yieldRangeTonnes) continue
    min += b.yieldRangeTonnes.min
    max += b.yieldRangeTonnes.max
    counted++
  }
  if (counted === 0) return null
  return { min, max, missing: blocks.length - counted }
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

  const stageBlocks: StageBlock[] = plot.blocks.map(b => ({
    id: b.id,
    areaHa: b.areaHa,
    orderIndex: b.orderIndex,
    label: `${b.label} · ${formatNumberId(b.areaHa, 2)} ha`,
    color: colourFor(b.spriteRow),
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
    // Carried only on this page: the per-tile panel is the only thing that
    // says them, and the signed-in plot page has a different panel.
    varietyName: b.varietyName,
    yieldRangeTonnes: b.yieldRangeTonnes,
  }))

  const lead = leadCommodity(plot.blocks)
  const yields = totalYield(plot.blocks)

  const ganttRows: GanttRow[] = plot.blocks.map(b => ({
    id: b.id,
    label: b.label,
    commodityName: b.commodityName,
    color: colourFor(b.spriteRow),
    window: b.window ? { start: b.window.start, end: b.window.end } : null,
  }))

  return (
    <Page className="flex flex-col gap-6">
      {/* The way back out. A shared link drops a reader straight onto this page
          with no history behind it, so "back" cannot be the browser's button --
          and the badge says what kind of page they landed on before they wonder
          whether they are seeing something they should not. */}
      <nav
        aria-label="Jejak halaman"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
      >
        <Link href="/atlas" className="interactive font-medium text-foreground hover:underline">
          ← Peta koperasi
        </Link>
        <span aria-hidden>·</span>
        <span>{plot.cooperativeName || `Desa ${plot.village}`}</span>
        <span aria-hidden>·</span>
        <span className="text-foreground">{plot.name}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
          Halaman publik
        </span>
      </nav>

      <PageHeader
        title={plot.name}
        description={
          <>
            {plot.memberName && `${plot.memberName} · `}
            {formatNumberId(plot.areaHa)} ha di {plot.village}, {plot.district}
          </>
        }
      />

      <div>
        <MetricRow
          items={[
            { label: 'Luas lahan', value: `${formatNumberId(plot.areaHa)} ha` },
            { label: 'Jumlah blok', value: plot.blocks.length },
            {
              label: 'Komoditas utama',
              value: lead ? (
                <span className="text-base">
                  {lead.name}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {Math.round(lead.sharePct)}%
                  </span>
                </span>
              ) : '—',
            },
            {
              label: 'Perkiraan hasil',
              value: yields
                ? `${formatNumberId(yields.min)}–${formatNumberId(yields.max)} t`
                : '—',
            },
          ]}
        />
        {yields && yields.missing > 0 && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Perkiraan hasil mencakup {plot.blocks.length - yields.missing} dari{' '}
            {plot.blocks.length} blok; sisanya belum punya rentang hasil varietas.
          </p>
        )}
      </div>

      {stageBlocks.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <SectionHeading>Diagram blok tanam</SectionHeading>
            <p className="text-xs text-muted-foreground">Ketuk satu ubin untuk rinciannya</p>
          </div>

          <PlotStage
            plotAreaHa={plot.areaHa}
            blocks={stageBlocks}
            terrainSeed={plot.terrainSeed}
            degraded={plot.degraded}
            variant="card"
            detail="tile"
          />

          {/* Legend, so the colours in the diagram, the table and the harvest
              chart are all readable as the same three things. */}
          <ul className="flex list-none flex-wrap gap-x-4 gap-y-1.5">
            {plot.blocks.map(b => (
              <li key={b.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: colourFor(b.spriteRow) }}
                />
                {b.commodityName}
                <span className="text-muted-foreground/70">{b.label}</span>
              </li>
            ))}
          </ul>

          {/* The tile grid is a diagram, never a map. Saying so is the whole
              reason this project can show a plot at all without claiming to
              know where its boundaries are. */}
          <p className="text-xs text-muted-foreground">
            Diagram lahan — ukuran blok sebanding dengan luasnya, bukan peta lokasi.
          </p>
        </section>
      )}

      {plot.blocks.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionHeading>Detail blok</SectionHeading>
          {/* A table, in its own scroller. Six columns of crop data do not fold
              onto a phone, and a page that scrolls sideways as a whole loses the
              reader their place in the column of text. */}
          <Card pad="none" className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">Komoditas</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Luas</th>
                  <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">Ditanam</th>
                  <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">Fase</th>
                  <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">Perkiraan panen</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Hasil</th>
                </tr>
              </thead>
              <tbody>
                {plot.blocks.map(b => (
                  <tr key={b.id} className="border-b border-border align-top last:border-0">
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-[3px]"
                          style={{ backgroundColor: colourFor(b.spriteRow) }}
                        />
                        <span className="font-medium text-foreground">{b.commodityName}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {b.label}
                        {b.varietyName && ` · ${b.varietyName}`}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                      {formatNumberId(b.areaHa, 2)} ha
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {plantedOn(b.plantingDate)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {/* Phase comes from the window's stage, so a block with no
                          prediction has no phase to claim either. */}
                      {b.window ? phaseLabel(b.window.stage) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <HarvestWindow window={b.window} degraded={plot.degraded} size="sm" />
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {b.yieldRangeTonnes ? (
                        <>
                          <span className="text-foreground">
                            {formatNumberId(b.yieldRangeTonnes.min)}–
                            {formatNumberId(b.yieldRangeTonnes.max)} t
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            rentang varietas
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {ganttRows.some(r => r.window) && (
        <section className="flex flex-col gap-2">
          <SectionHeading>Jendela panen lahan ini</SectionHeading>
          <Card>
            <HarvestGantt rows={ganttRows} />
          </Card>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Setiap batang adalah rentang, bukan satu tanggal. Blok yang batangnya
            berdekatan akan panen bersamaan.
          </p>
        </section>
      )}

      {plot.blocks.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Tidak ada tanaman yang sedang tumbuh di lahan ini saat ini.
        </p>
      )}

      <ShareLink title={`${plot.name} — ${plot.memberName}`} />

      <PlotNeighbours
        neighbours={plot.neighbours}
        cooperativeName={plot.cooperativeName}
        village={plot.village}
      />

      <p className="border-t border-border pt-4 text-xs text-muted-foreground">
        Halaman ini dibagikan oleh koperasi. Perkiraan panen dihitung dari cuaca
        yang tercatat dan dapat berubah. Terrion adalah penyedia sistem.
      </p>
    </Page>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { HarvestGantt, type GanttRow } from '@/components/plots/HarvestGantt'
import { PlotNeighbours } from '@/components/plots/PlotNeighbours'
import { FarmWorkspace } from '@/components/plots/FarmWorkspace'
import { HarvestCardButton } from '@/components/plots/HarvestCardButton'
import type { StageBlock } from '@/components/plots/PlotStage'
import { ShareLink } from '@/components/plots/ShareLink'
import { Logo } from '@/components/ui/Logo'
import { phaseLabel } from '@/lib/agronomy/phase'
import { formatNumberId } from '@/lib/format/number'
import { formatHarvestRange, MONTHS_ID } from '@/lib/harvest/format'
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
    // With the daily GDD series, which is what lets the time slider work here
    // as it does on the signed-in page. This used to be stripped to keep the
    // payload small for a phone on a village connection -- a fair worry, but
    // measured against the wrong thing: GET /api/public/plots/:id already
    // sends the series (see HarvestWindowToResponse's withSeries), so the cost
    // of keeping it is a few kilobytes of flight data, not a second request.
    window: b.window,
    plantingDate: b.plantingDate.toISOString().slice(0, 10),
    gddRequired: b.window?.gddRequired ?? 0,
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
    // Laid out like the Atlas and the signed-in plot page: the garden IS the
    // picture, and everything said about it sits in one panel beside it. This
    // page used to be a document with the farm embedded in it as a card, so
    // the diagram -- the thing a farmer shares this link to show -- was a
    // letterboxed strip a reader had to scroll past.
    //
    // It sits outside the (public) route group for the same reason /atlas
    // does: that group's sticky header and footer cannot wrap a page that is
    // exactly the viewport. The way back out is in the panel instead.
    <div className="h-dvh w-full overflow-hidden">
      <FarmWorkspace
        plotAreaHa={plot.areaHa}
        blocks={stageBlocks}
        terrainSeed={plot.terrainSeed}
        degraded={plot.degraded}
        detail="tile"
        panelLabel={`Rincian ${plot.name}`}
        header={
          <div className="shrink-0 border-b border-border px-4 py-3">
            {/* A shared link drops a reader here with no history behind it, so
                "back" cannot be the browser's button -- and the badge says what
                kind of page they landed on before they wonder whether they are
                seeing something they should not. */}
            <div className="flex items-center justify-between gap-3">
              <Link href="/" aria-label="Terrion — beranda">
                <Logo size={22} />
              </Link>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                Halaman publik
              </span>
            </div>

            <nav aria-label="Jejak halaman" className="mt-2.5 text-xs text-muted-foreground">
              <Link href="/atlas" className="interactive font-medium text-foreground hover:underline">
                ← Peta koperasi
              </Link>
              {plot.cooperativeName && <span className="ml-2">{plot.cooperativeName}</span>}
            </nav>

            <h1 className="mt-2 text-lg font-semibold text-foreground">{plot.name}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {plot.memberName && `${plot.memberName} · `}
              {formatNumberId(plot.areaHa)} ha di {plot.village}, {plot.district}
            </p>
          </div>
        }
      >
        <section className="border-b border-border px-4 py-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {[
              ['Luas lahan', `${formatNumberId(plot.areaHa)} ha`],
              ['Jumlah blok', String(plot.blocks.length)],
              [
                'Komoditas utama',
                lead ? `${lead.name} · ${Math.round(lead.sharePct)}%` : '—',
              ],
              [
                'Perkiraan hasil',
                yields
                  ? `${formatNumberId(yields.min)}–${formatNumberId(yields.max)} t`
                  : '—',
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[0.6875rem] text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 text-base leading-tight font-semibold text-foreground">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {yields && yields.missing > 0 && (
            <p className="mt-2.5 text-xs text-muted-foreground">
              Perkiraan hasil mencakup {plot.blocks.length - yields.missing} dari{' '}
              {plot.blocks.length} blok; sisanya belum punya rentang hasil varietas.
            </p>
          )}
        </section>

        {plot.blocks.length > 0 && (
          // A stacked list, not the six-column table this used to be. That
          // table needed 36rem and lived in its own sideways scroller; the
          // panel is 22rem, and a column of rows says the same six things
          // without asking anybody to scroll across.
          <section className="border-b border-border px-4 py-4">
            <h2 className="text-xs font-medium text-muted-foreground">Blok tanam</h2>
            <ul className="mt-3 flex list-none flex-col gap-4">
              {plot.blocks.map(b => (
                <li key={b.id} className="flex flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-[3px]"
                      style={{ backgroundColor: colourFor(b.spriteRow) }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {b.commodityName}
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      {formatNumberId(b.areaHa, 2)} ha
                    </span>
                  </span>

                  <span className="pl-[1.125rem] text-xs text-muted-foreground">
                    {b.label}
                    {b.varietyName && ` · ${b.varietyName}`}
                    {' · ditanam '}
                    {plantedOn(b.plantingDate)}
                    {/* Phase comes from the window's stage, so a block with no
                        prediction has no phase to claim either. */}
                    {b.window && ` · ${phaseLabel(b.window.stage)}`}
                  </span>

                  <span className="pl-[1.125rem]">
                    <HarvestWindow window={b.window} degraded={plot.degraded} size="sm" />
                  </span>

                  {b.yieldRangeTonnes && (
                    <span className="pl-[1.125rem] text-xs tabular-nums text-muted-foreground">
                      {formatNumberId(b.yieldRangeTonnes.min)}–
                      {formatNumberId(b.yieldRangeTonnes.max)} t
                      <span className="ml-1">rentang varietas</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {/* The tile grid is a diagram, never a map. Saying so is the whole
                reason this project can show a plot at all without claiming to
                know where its boundaries are. */}
            <p className="mt-4 text-xs text-muted-foreground">
              Ketuk satu ubin pada diagram untuk rinciannya. Ukuran blok
              sebanding dengan luasnya, bukan peta lokasi.
            </p>
          </section>
        )}

        {ganttRows.some(r => r.window) && (
          <section className="border-b border-border px-4 py-4">
            <h2 className="text-xs font-medium text-muted-foreground">
              Jendela panen lahan ini
            </h2>
            <div className="mt-3">
              <HarvestGantt rows={ganttRows} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Setiap batang adalah rentang, bukan satu tanggal. Blok yang
              batangnya berdekatan akan panen bersamaan.
            </p>
          </section>
        )}

        {plot.blocks.length === 0 && (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            Tidak ada tanaman yang sedang tumbuh di lahan ini saat ini.
          </p>
        )}

        <section className="flex flex-col gap-2 border-b border-border px-4 py-4">
          <ShareLink title={`${plot.name} — ${plot.memberName}`} />
          {/* A picture for the group chat, where a link is a grey preview box
              somebody has to tap and an image is just there. */}
          <HarvestCardButton
            facts={{
              plotName: plot.name,
              memberName: plot.memberName,
              place: `${plot.village}, ${plot.district}`,
              areaHa: plot.areaHa,
              degraded: plot.degraded,
              crops: plot.blocks.map(b => ({
                name: b.commodityName,
                window: b.window ? formatHarvestRange(b.window.start, b.window.end) : null,
                tonnes: b.yieldRangeTonnes
                  ? `${formatNumberId(b.yieldRangeTonnes.min)}–`
                    + `${formatNumberId(b.yieldRangeTonnes.max)} t`
                  : null,
              })),
            }}
          />
        </section>

        <section className="px-4 py-4">
          <PlotNeighbours
            neighbours={plot.neighbours}
            cooperativeName={plot.cooperativeName}
            village={plot.village}
          />

          <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            Halaman ini dibagikan oleh koperasi. Perkiraan panen dihitung dari
            cuaca yang tercatat dan dapat berubah. Terrion adalah penyedia sistem.
          </p>
        </section>
      </FarmWorkspace>
    </div>
  )
}

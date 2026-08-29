import { notFound, redirect } from 'next/navigation'

import type { FarmSummary } from '@/components/plots/FarmSummaryPanel'
import { PlotStage, type StageBlock } from '@/components/plots/PlotStage'
import { utcDate } from '@/lib/agronomy/dates'
import { formatDateId } from '@/lib/harvest/format'
import { predictHarvest } from '@/lib/agronomy/predict'
import type { Variety } from '@/lib/agronomy/types'
import { currentAppUser } from '@/lib/auth/session'
import { commodityColour } from '@/lib/plots/colour'
import { createServerClient } from '@/lib/supabase/server'
import { loadWeatherFor } from '@/lib/weather/sync'

export default async function PlotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await currentAppUser()
  if (!user) redirect('/login')

  const db = await createServerClient()

  // RLS scopes this to the viewer's cooperative, so a missing row and a
  // forbidden row look the same from here — both are notFound.
  //
  // A query error is a THIRD case and must not join them. A malformed select
  // returns no data, and treating that as notFound renders a 404 that blames
  // the URL for a bug in this file — which is exactly how a wrong column name
  // in the join below survived review and a typecheck.
  const { data: plot, error: plotError } = await db.from('plot')
    .select('id, name, area_ha, public_id, grid_lat, grid_lng, terrain_seed, member:member_id(name)')
    .eq('id', id).maybeSingle()
  if (plotError) throw new Error(`Gagal memuat lahan: ${plotError.message}`)
  if (!plot) notFound()

  // Every season recorded on this plot, filtered in memory rather than in the
  // query. Only the unharvested seasons are standing crop -- a block is a
  // season, not a spatial subdivision, so past ones would stack several times
  // the plot's area onto the same tiles -- but whether harvested seasons exist
  // is what separates "no blocks yet" from "the season is over", and those two
  // states must not share a sentence.
  const { data: allBlocks } = await db.from('block')
    .select('id, label, area_ha, order_index, commodity_id, variety_id, planting_date, actual_harvest_date')
    .eq('plot_id', plot.id).order('order_index')

  const blocks = (allBlocks ?? []).filter(b => b.actual_harvest_date === null)

  const commodityIds = [...new Set(blocks.map(b => b.commodity_id))]
  const varietyIds = [...new Set(blocks.map(b => b.variety_id))]
  // Two pairs of reads on the same reference tables, and they are not the same
  // question. The first two describe what is ALREADY planted here, so they are
  // scoped to this plot's ids. The second two are the choices for planting
  // something NEW, so they are the whole catalogue -- a handful of rows, seeded
  // once, cached by Next.
  const [
    { data: commodities }, { data: varieties },
    { data: allCommodities }, { data: allVarieties },
  ] = await Promise.all([
    db.from('commodity').select('id, name, sprite_row').in('id', commodityIds),
    db.from('variety').select('*').in('id', varietyIds),
    db.from('commodity').select('id, name').order('sprite_row'),
    db.from('variety').select('id, commodity_id, name').order('name'),
  ])
  const commodityById = new Map((commodities ?? []).map(c => [c.id, c]))
  const varietyById = new Map<string, Variety>((varieties ?? []).map(v => [v.id, {
    gddRequirement: Number(v.gdd_requirement), baseTempC: Number(v.base_temp_c),
    daysToHarvestMin: v.days_to_harvest_min, daysToHarvestMax: v.days_to_harvest_max,
    yieldPerHaMin: Number(v.yield_per_ha_min), yieldPerHaMax: Number(v.yield_per_ha_max),
  }]))

  const { observed, normals } = await loadWeatherFor(
    Number(plot.grid_lat), Number(plot.grid_lng), undefined, new Date(), db)
  // A plot registered seconds ago has no weather yet — the backfill runs after
  // the response. Say so rather than predicting from nothing.
  const degraded = normals.length === 0

  // Splitting a block is a write, and writes on `block` belong to kaders and
  // pengurus. The action re-checks; this decides whether the button is even
  // offered, because a button that always refuses is worse than no button.
  const canEdit = user.role === 'kader' || user.role === 'pengurus'

  const today = new Date().toISOString().slice(0, 10)
  const rows = blocks.map(b => {
    const variety = varietyById.get(b.variety_id)
    const commodity = commodityById.get(b.commodity_id)
    const window = variety && !degraded
      ? predictHarvest({
          plantingDate: utcDate(b.planting_date),
          observed: observed.filter(d => d.date <= today),
          forecast: observed.filter(d => d.date > today),
          climatology: normals,
          variety,
        })
      : null
    return { block: b, commodity, window }
  })

  const stageBlocks: StageBlock[] = rows.map(({ block, commodity, window }) => ({
    id: block.id,
    areaHa: Number(block.area_ha),
    orderIndex: block.order_index,
    label: `${block.label} · ${Number(block.area_ha).toFixed(2)} ha`,
    color: commodityColour(commodity?.sprite_row ?? 0),
    spriteRow: commodity?.sprite_row ?? 0,
    stage: window?.stage ?? 0,
    commodityName: commodity?.name ?? 'Komoditas tidak dikenal',
    plantingDateLabel: formatDateId(utcDate(block.planting_date)),
    window,
    plantingDate: block.planting_date,
    gddRequired: varietyById.get(block.variety_id)?.gddRequirement ?? 0,
  }))

  // What the farmhouse popup shows: the totals the per-block panel does not.
  //
  // Tonnage is a range because every variety publishes a range; collapsing it
  // to one number would put the only unmeasured figure on the screen. The
  // window spans every standing block, so it is a bucket rather than a
  // prediction -- which is why it carries no confidence.
  const starts = rows.map(r => r.window?.start).filter(Boolean) as Date[]
  const ends = rows.map(r => r.window?.end).filter(Boolean) as Date[]

  const summary: FarmSummary = {
    plotName: plot.name,
    memberName: plot.member?.name ?? 'Petani tidak tercatat',
    areaHa: Number(plot.area_ha),
    blockCount: blocks.length,
    commodities: [...new Set(rows.map(r => r.commodity?.name).filter(Boolean) as string[])],
    publicId: plot.public_id,
    tonnesMin: rows.reduce((sum, r) => {
      const v = varietyById.get(r.block.variety_id)
      return sum + (v ? v.yieldPerHaMin * Number(r.block.area_ha) : 0)
    }, 0),
    tonnesMax: rows.reduce((sum, r) => {
      const v = varietyById.get(r.block.variety_id)
      return sum + (v ? v.yieldPerHaMax * Number(r.block.area_ha) : 0)
    }, 0),
    window: starts.length > 0 && ends.length > 0
      ? {
          start: new Date(Math.min(...starts.map(d => d.getTime()))),
          end: new Date(Math.max(...ends.map(d => d.getTime()))),
          basis: rows.some(r => r.window && r.window.basis !== 'observed')
            ? 'climatology' : 'observed',
        }
      : null,
  }

  return (
    // Full-bleed: the farm IS the screen. AppShell puts this route in its
    // immersive frame, so this fills the viewport exactly and nothing above it
    // adds padding or a scrollbar.
    <main className="relative h-full w-full overflow-hidden">
      {stageBlocks.length > 0 ? (
        <>
          <PlotStage
            plotAreaHa={Number(plot.area_ha)}
            blocks={stageBlocks}
            terrainSeed={plot.terrain_seed}
            summary={summary}
            degraded={degraded}
            editing={canEdit
              ? { commodities: allCommodities ?? [], varieties: allVarieties ?? [] }
              : undefined}
          />

          {/* A card, not a bar with a gradient under it. The gradient was there
              to keep the title legible over the canvas, but it dimmed the top
              of the farm to do it -- which is the part of the picture the eye
              lands on first. A card carries its own background instead.

              Top-centre on a wide screen, because the shell's own cards hold
              the two top corners; below them on a narrow one. */}
          <header className="absolute inset-x-3 top-16 z-30 w-fit max-w-[calc(100%-1.5rem)] rounded-xl border border-border bg-background/85 px-3 py-2 shadow-[var(--shadow-lg)] backdrop-blur-md md:inset-x-auto md:top-3 md:left-1/2 md:-translate-x-1/2">
            <h1 className="text-sm font-semibold text-foreground">{plot.name}</h1>
            <p className="text-xs text-muted-foreground">
              {Number(plot.area_ha).toFixed(2)} ha · {stageBlocks.length} blok ·
              kode publik {plot.public_id}
            </p>
          </header>
        </>
      ) : (
        <div className="mx-auto w-full max-w-3xl p-4">
          <header className="mb-4">
            <h1 className="text-lg font-semibold">{plot.name}</h1>
            <p className="text-sm text-muted-foreground">
              {Number(plot.area_ha).toFixed(2)} ha · kode publik {plot.public_id}
            </p>
          </header>
          <p className="text-sm text-muted-foreground">
            {(allBlocks ?? []).length === 0
              ? 'Lahan ini belum punya blok.'
              : 'Belum ada tanaman aktif — seluruh musim di lahan ini sudah dipanen.'}
          </p>
        </div>
      )}
    </main>
  )
}

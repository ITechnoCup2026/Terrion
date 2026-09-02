'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { FarmView } from '@/components/atlas/FarmView'
import { MAP, SUPPLY_RAMP } from '@/components/atlas/palette'
import { Logo } from '@/components/ui/Logo'
import { isoWeekStart } from '@/lib/agronomy/dates'
import type { AtlasCooperative } from '@/lib/atlas/load'
import { commodityStyle } from '@/lib/catalog/commodity-style'
import type { RegionSupply } from '@/lib/atlas/supply'
import { formatNumberId } from '@/lib/format/number'
import { monthTicks, RULER_WEEKS, supplyRows } from '@/lib/supply/ruler'
import { cn } from '@/lib/utils'

/**
 * Everything the Atlas has to say, in one docked column.
 *
 * It replaces six things that used to float over the map in five different
 * corners: a breadcrumb, an "Esc untuk kembali" hint, a reset button, a
 * legend, a counts box, and a row of navigation links -- all drawn as the same
 * translucent black pill, so a legend carried exactly as much visual weight as
 * the primary navigation and the eye had nowhere to rest.
 *
 * More than tidying, it is what lets a click on a province answer something.
 * Selecting a region used to only move the camera; you learned what was there
 * by hunting for an 8px dot and opening a full-screen modal. Now the region
 * you are looking at states its own figures, shows when its harvest lands, and
 * lists what you can open -- and the map behind it never goes away.
 */

export type RegionListItem = {
  key: string
  name: string
  cooperatives: number
  tonnes: number
}

export function AtlasPanel({
  level,
  provinceName,
  regencyName,
  region,
  regions,
  cooperatives,
  farmId,
  homeHref,
  homeLabel,
  showCatalog,
  onGoCountry,
  onGoProvince,
  onOpenRegion,
  onOpenFarm,
  onCloseFarm,
  onHoverCooperative,
}: {
  level: 'country' | 'province' | 'regency'
  provinceName: string | null
  regencyName: string | null
  /** Figures for what is currently selected; the country's totals at the top level. */
  region: RegionSupply
  /** What can be drilled into from here — provinces at the country level. */
  regions: RegionListItem[]
  /** The cooperatives inside the current selection. */
  cooperatives: AtlasCooperative[]
  farmId: string | null
  homeHref: string
  homeLabel: string
  showCatalog: boolean
  onGoCountry: () => void
  onGoProvince: () => void
  onOpenRegion: (key: string) => void
  onOpenFarm: (id: string) => void
  onCloseFarm: () => void
  onHoverCooperative: (id: string | null) => void
}) {
  const scopeName = regencyName ?? provinceName ?? 'Indonesia'

  return (
    <aside
      aria-label="Rincian wilayah"
      className={cn(
        'flex shrink-0 flex-col border-border bg-card',
        'h-[55dvh] border-t lg:h-full lg:w-[22rem] lg:border-t-0 lg:border-r xl:w-96',
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <Link href={homeHref} aria-label={`Terrion — ${homeLabel.toLowerCase()}`}>
          <Logo size={22} />
        </Link>
        <Link
          href={homeHref}
          className="interactive text-xs text-muted-foreground hover:text-foreground"
        >
          {homeLabel}
        </Link>
      </header>

      {/* The farm takes over the column rather than the screen. Losing the map
          to a modal was the module contradicting its own premise -- drilling
          down is supposed to feel like one place, not four screens. */}
      {farmId ? (
        <FarmView key={farmId} cooperativeId={farmId} onClose={onCloseFarm} />
      ) : (
        <>
          <Breadcrumb
            level={level}
            provinceName={provinceName}
            regencyName={regencyName}
            onGoCountry={onGoCountry}
            onGoProvince={onGoProvince}
          />

          <div className="min-h-0 flex-1 overflow-y-auto">
            <section className="border-b border-border px-4 py-4">
              <h1 className="text-lg font-semibold text-foreground">{scopeName}</h1>
              <RegionFigures region={region} />
            </section>

            <SupplyWindow listings={region.listings} />

            {regions.length > 0 && (
              <RegionList
                title={level === 'country' ? 'Provinsi dengan pasokan' : 'Kabupaten dengan pasokan'}
                items={regions}
                onOpen={onOpenRegion}
              />
            )}

            {/* Not at the country level. There the list to offer is provinces
                -- one row per place worth flying to -- and repeating every
                cooperative in the country underneath it is both a duplicate of
                the same information and, once Terrion has more than a village's
                worth of members, several hundred rows nobody scrolls. */}
            {level !== 'country' && cooperatives.length > 0 && (
              <CooperativeList
                cooperatives={cooperatives}
                onOpen={onOpenFarm}
                onHover={onHoverCooperative}
              />
            )}
          </div>

          <Legend showCatalog={showCatalog} />
        </>
      )}
    </aside>
  )
}

function Breadcrumb({
  level, provinceName, regencyName, onGoCountry, onGoProvince,
}: {
  level: 'country' | 'province' | 'regency'
  provinceName: string | null
  regencyName: string | null
  onGoCountry: () => void
  onGoProvince: () => void
}) {
  return (
    <nav
      aria-label="Tingkat wilayah"
      className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-4 py-2 text-xs"
    >
      <Crumb onClick={onGoCountry} current={level === 'country'}>
        Indonesia
      </Crumb>

      {provinceName && (
        <>
          <ChevronRight aria-hidden className="size-3 shrink-0 text-border" />
          <Crumb onClick={onGoProvince} current={level === 'province'}>
            {provinceName}
          </Crumb>
        </>
      )}

      {regencyName && (
        <>
          <ChevronRight aria-hidden className="size-3 shrink-0 text-border" />
          <span className="px-1 font-medium text-foreground">{regencyName}</span>
        </>
      )}

      {level !== 'country' && (
        <kbd className="ml-auto rounded border border-border px-1 font-mono text-[0.625rem] text-[var(--terrion-ink-faint)]">
          Esc
        </kbd>
      )}
    </nav>
  )
}

function Crumb({
  onClick, current, children,
}: {
  onClick: () => void
  current: boolean
  children: React.ReactNode
}) {
  if (current) return <span className="px-1 font-medium text-foreground">{children}</span>
  return (
    <button
      type="button"
      onClick={onClick}
      className="interactive rounded px-1 text-muted-foreground hover:text-foreground"
    >
      {children}
    </button>
  )
}

/**
 * The four figures for whatever is selected.
 *
 * Tonnage is last and is the only one that can be absent: a region with
 * registered land and no recorded planting has not projected zero tonnes, it
 * has projected nothing, and it says so rather than showing a confident 0 --
 * the same rule <ImpactPanel> follows on the dashboard.
 */
function RegionFigures({ region }: { region: RegionSupply }) {
  const figures: [string, string][] = [
    ['Koperasi', formatNumberId(region.cooperatives)],
    ['Lahan', formatNumberId(region.plots)],
    ['Hektare', formatNumberId(region.hectares)],
    ['Panen 12 minggu', region.tonnes > 0 ? `${formatNumberId(region.tonnes)} t` : 'Belum ada'],
  ]

  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
      {figures.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[0.6875rem] text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 text-xl leading-none font-semibold tabular-nums text-foreground">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * When the selected region's harvest lands, as bands on a week ruler.
 *
 * The same form the landing page opens with and the same tested rule behind
 * it, at panel width. This is the thing the Atlas never said: it knew where
 * cooperatives were and nothing about the only question the rest of the
 * product answers, which is when the supply arrives.
 */
function SupplyWindow({ listings }: { listings: RegionSupply['listings'] }) {
  const from = isoWeekStart(new Date())
  const rows = supplyRows(listings, from)
  if (rows.length === 0) return null

  const ticks = monthTicks(from)

  return (
    <section className="border-b border-border px-4 py-4">
      <h2 className="text-xs font-medium text-muted-foreground">Perkiraan panen, dua belas minggu</h2>

      <div className="mt-3">
        {/* The scale is a row with the same spacers as the rows below it, not
            a margin tuned to match them. Matching numbers is how a scale ends
            up stretched over the tonnage column, naming every month a few days
            later than the week it labels. */}
        <div className="flex items-center gap-2">
          <span aria-hidden className="w-16 shrink-0" />
          <span className="relative h-4 flex-1">
            {ticks.map(tick => (
              <span
                key={tick.label}
                className="absolute top-0 -translate-x-1/2 text-[0.625rem] text-[var(--terrion-ink-faint)] first:translate-x-0"
                style={{ left: `${tick.left}%` }}
              >
                {tick.label}
              </span>
            ))}
          </span>
          <span aria-hidden className="w-12 shrink-0" />
        </div>

        <ul>
          {rows.map(row => (
            <li key={row.commodity} className="flex items-center gap-2 py-1">
              <span className="flex w-16 shrink-0 items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: commodityStyle(row.commodity).hue }}
                />
                <span className="truncate text-[0.75rem] font-medium text-foreground">
                  {row.commodity}
                </span>
              </span>
              <span className="relative h-4 flex-1 rounded-sm bg-muted">
                {row.runs.map(([start, length]) => (
                  <span
                    key={start}
                    className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
                    style={{
                      left: `${(start / RULER_WEEKS) * 100}%`,
                      width: `${(length / RULER_WEEKS) * 100}%`,
                      background: commodityStyle(row.commodity).hue,
                    }}
                  />
                ))}
              </span>
              <span className="w-12 shrink-0 text-right text-[0.6875rem] font-medium tabular-nums text-foreground">
                {formatNumberId(row.tonnes)} t
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-2 text-[0.6875rem] leading-relaxed text-[var(--terrion-ink-faint)]">
        Setiap batang adalah rentang minggu, bukan tanggal.
      </p>
    </section>
  )
}

/** Where to go next, ranked by how much is coming out of each place. */
function RegionList({
  title, items, onOpen,
}: {
  title: string
  items: RegionListItem[]
  onOpen: (key: string) => void
}) {
  return (
    <section className="border-b border-border py-2">
      <h2 className="px-4 py-1.5 text-xs font-medium text-muted-foreground">{title}</h2>
      <ul>
        {items.map(item => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onOpen(item.key)}
              className="interactive flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left hover:bg-secondary/50"
            >
              <span className="min-w-0">
                <span className="block truncate text-[0.8125rem] font-medium text-foreground">{item.name}</span>
                <span className="block text-[0.6875rem] text-muted-foreground">
                  {formatNumberId(item.cooperatives)} koperasi
                </span>
              </span>
              <span className="shrink-0 text-[0.75rem] tabular-nums text-muted-foreground">
                {item.tonnes > 0 ? `${formatNumberId(item.tonnes)} t` : '—'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The cooperatives you can actually open from here. */
function CooperativeList({
  cooperatives, onOpen, onHover,
}: {
  cooperatives: AtlasCooperative[]
  onOpen: (id: string) => void
  onHover: (id: string | null) => void
}) {
  return (
    <section className="py-2">
      <h2 className="px-4 py-1.5 text-xs font-medium text-muted-foreground">Koperasi</h2>
      <ul>
        {cooperatives.map(c => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onOpen(c.id)}
              onMouseEnter={() => onHover(c.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(c.id)}
              onBlur={() => onHover(null)}
              className="interactive flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left hover:bg-secondary/50"
            >
              <span className="min-w-0">
                <span className="block truncate text-[0.8125rem] font-medium text-foreground">{c.name}</span>
                <span className="block truncate text-[0.6875rem] text-muted-foreground">
                  {c.village}, {c.district}
                </span>
              </span>
              <span className="shrink-0 text-[0.6875rem] tabular-nums text-muted-foreground">
                {formatNumberId(c.plotCount)} lahan
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * What the shading means, and the way out.
 *
 * The ramp is drawn as one continuous strip with only its ends named. Five
 * swatches each with their own caption would be five labels for a scale whose
 * middle steps have no natural name; the strip says "more is darker" in the
 * space one of those captions would have taken.
 */
function Legend({ showCatalog }: { showCatalog: boolean }) {
  return (
    <footer className="shrink-0 border-t border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="flex-1">
          <span aria-hidden className="flex h-2 overflow-hidden rounded-sm">
            {SUPPLY_RAMP.map(colour => (
              <span key={colour} className="flex-1" style={{ background: colour }} />
            ))}
          </span>
          <span className="mt-1 flex justify-between text-[0.625rem] text-[var(--terrion-ink-faint)]">
            <span>Belum ada proyeksi</span>
            <span>Pasokan terbanyak</span>
          </span>
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.625rem] text-[var(--terrion-ink-faint)]">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 rounded-full ring-2 ring-white"
            style={{ background: MAP.pin }}
          />
          Lokasi koperasi
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 rounded-[2px] border"
            style={{ background: MAP.land, borderColor: MAP.landStroke }}
          />
          Belum ada koperasi
        </span>
      </div>

      {showCatalog && (
        <Link
          href="/catalog"
          className="interactive mt-3 inline-block text-xs text-primary underline-offset-4 hover:underline"
        >
          Lihat katalog pasokan
        </Link>
      )}
    </footer>
  )
}

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Sprout,
  Store,
} from 'lucide-react'

import { CropMark } from '@/components/commerce/CropMark'
import { Badge } from '@/components/ui/Badge'
import { buttonVariants } from '@/components/ui/button'
import { MetricRow, type Metric } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/Page'
import { ShareBar } from '@/components/ui/Sparkbars'
import { utcDate } from '@/lib/agronomy/dates'
import { commodityStyle } from '@/lib/catalog/commodity-style'
import { REQUEST_STATUS_LABEL } from '@/lib/catalog/copy'
import type { Listing } from '@/lib/catalog/listings'
import { formatNumberId } from '@/lib/format/number'
import { formatHarvestRange } from '@/lib/harvest/format'
import type { SupplyRequest } from '@/lib/supply-requests/load'
import { cn } from '@/lib/utils'

const STATUS_TONE: Record<SupplyRequest['status'], 'positive' | 'warning' | 'negative' | 'neutral'> = {
  accepted: 'positive',
  pending: 'warning',
  declined: 'negative',
  withdrawn: 'neutral',
}

export type BuyerHomeProps = {
  requests: SupplyRequest[]
  listings: Listing[]
  commodities: { id: string; name: string }[]
  provinces: string[]
  /** Cooperative names, so a request can say who it was sent to. */
  cooperativeNames: Map<string, string>
}

export function BuyerHome({
  requests,
  listings,
  commodities,
  cooperativeNames,
}: BuyerHomeProps) {
  const commodityNames = new Map(commodities.map(c => [c.id, c.name]))

  const pending = requests.filter(r => r.status === 'pending')
  const accepted = requests.filter(r => r.status === 'accepted')
  const acceptedTonnes = accepted.reduce((sum, r) => sum + r.volumeKg / 1000, 0)

  const recent = [...requests]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  const soonest = [...listings]
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
    .slice(0, 5)
  const heaviest = soonest.reduce((most, l) => Math.max(most, l.tonnes), 0)

  const marketTonnes = listings.reduce((sum, l) => sum + l.tonnes, 0)
  const cooperativeCount = new Set(listings.map(l => l.cooperativeId)).size

  // The catalogue rolled up per crop.
  //
  // The panel beside it lists individual harvest windows -- one cooperative,
  // one week, one figure -- which is what you read when you are ready to
  // contract. This is the other question, asked first: does this market grow
  // what I buy at all, and how much of it. It is also the shortest path from
  // "I buy wortel" to the catalogue filtered to wortel, which previously took
  // a visit to the catalogue and a select.
  const byCommodity = new Map<
    string,
    { id: string; name: string; tonnes: number; windows: number; cooperatives: Set<string> }
  >()
  for (const listing of listings) {
    const entry = byCommodity.get(listing.commodityId) ?? {
      id: listing.commodityId,
      name: commodityNames.get(listing.commodityId) ?? listing.commodityName,
      tonnes: 0,
      windows: 0,
      cooperatives: new Set<string>(),
    }
    entry.tonnes += listing.tonnes
    entry.windows += 1
    entry.cooperatives.add(listing.cooperativeId)
    byCommodity.set(listing.commodityId, entry)
  }
  const crops = [...byCommodity.values()].sort((a, b) => b.tonnes - a.tonnes).slice(0, 6)
  const heaviestCrop = crops.reduce((most, c) => Math.max(most, c.tonnes), 0)

  // "Lihat semua (1)" over a list already showing that one request is an
  // invitation to a page the reader is effectively already on.
  const hiddenRequests = requests.length - recent.length

  const kpis: Metric[] = [
    {
      label: 'Menunggu persetujuan',
      value: formatNumberId(pending.length),
      icon: Clock,
      tone: pending.length > 0 ? 'accent' : 'default',
      hint: pending.length > 0 ? 'Perlu keputusan koperasi' : 'Semua pengajuan telah terjawab',
    },
    {
      label: 'Kontrak disepakati',
      value: formatNumberId(accepted.length),
      icon: CheckCircle2,
      tone: 'positive',
      hint: acceptedTonnes > 0 ? `${formatNumberId(acceptedTonnes)} ton disetujui` : 'Belum ada permintaan disetujui',
    },
    {
      label: 'Total permintaan',
      value: formatNumberId(requests.length),
      icon: FileText,
      tone: 'info',
      hint: 'Rekam jejak pengajuan pasokan',
    },
    {
      label: 'Pasokan di katalog',
      value: `${formatNumberId(marketTonnes)} t`,
      icon: Store,
      tone: 'default',
      hint: `${cooperativeCount} koperasi mitra, 12 minggu`,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* ─── METRIC ROW ────────────────────────────────────────────────────── */}
      <section aria-label="Ringkasan Kinerja Pasokan" style={riseDelay(0)} className="rise">
        <MetricRow items={kpis} />
      </section>

      {/* ─── 2-COLUMN WORKSPACE ───────────────────────────────────────────────
          Not two equal halves any more, and the left one is a column rather
          than a single panel.

          Equal halves assumed the two lists would be roughly as long as each
          other, and a buyer's never are: their own requests start at nought
          and grow one at a time, while the catalogue arrives full. One
          request beside five listings left an outlined box with three hundred
          pixels of nothing under a single row -- and an empty bordered
          rectangle does not read as "a short list", it reads as a panel that
          failed to load.

          So the right column takes the wider share, because a harvest window
          carries more per row (crop, variety, week, cooperative, district,
          range, tonnage, bar) and was wrapping onto a second line at half
          width; and the left column stacks two shorter panels, which is what
          gives the row a bottom edge no matter how few requests exist yet.

          `items-start` still: the columns have no reason to be the same
          height, and stretching them only moves the empty space around. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-6">
        {/* Left: the buyer's own requests */}
        <section
          aria-labelledby="recent-requests-heading"
          style={riseDelay(60)}
          className="rise panel flex flex-col p-5 sm:p-6"
        >
          <PanelHeader
            id="recent-requests-heading"
            icon={FileText}
            title="Permintaan Pasokan Terbaru"
            description="Status pengajuan kontrak pasokan Anda ke koperasi mitra"
          />

          {recent.length === 0 ? (
            <PanelEmpty
              title="Belum ada permintaan yang diajukan"
              body="Pilih komoditas panen di katalog pasokan, lalu ajukan estimasi volume yang Anda butuhkan tanpa perantara."
              action={
                <Link
                  href="/catalog"
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'interactive mt-4 gap-2 bg-[var(--terrion-green-700)] font-medium text-white shadow-xs hover:bg-[var(--terrion-green-900)]',
                  )}
                >
                  <Store className="size-4" />
                  Mulai dari Katalog
                </Link>
              }
            />
          ) : (
            <ul className="mt-1 flex flex-col divide-y divide-border/60">
              {recent.map(r => {
                const name = commodityNames.get(r.commodityId) ?? 'Komoditas'
                const coopName = cooperativeNames.get(r.cooperativeId) ?? 'Koperasi Mitra'

                return (
                  <li key={r.id}>
                    <Link href="/my-requests" className={ROW}>
                      <CropMark name={name} size="md" />

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground transition-colors group-hover/row:text-[var(--terrion-green-700)]">
                            {name}
                          </span>
                          <Badge tone={STATUS_TONE[r.status]}>
                            {REQUEST_STATUS_LABEL[r.status]}
                          </Badge>
                        </span>
                        <RowMeta who={coopName}>
                          {formatHarvestRange(utcDate(r.windowStart), utcDate(r.windowEnd))}
                        </RowMeta>
                      </span>

                      <Tonnage value={r.volumeKg / 1000} />
                      <ChevronRight
                        aria-hidden
                        className="size-4 shrink-0 text-[var(--terrion-ink-faint)]/60 transition-all group-hover/row:translate-x-0.5 group-hover/row:text-[var(--terrion-green-700)]"
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Only when the list is actually holding something back. */}
          {hiddenRequests > 0 && (
            <PanelFooterLink href="/my-requests">
              Lihat semua permintaan ({formatNumberId(requests.length)})
            </PanelFooterLink>
          )}
        </section>

        {/* Left, beneath: the catalogue as crops rather than as weeks. */}
        {crops.length > 0 && (
          <section
            aria-labelledby="catalog-crops-heading"
            style={riseDelay(90)}
            className="rise panel flex flex-col p-5 sm:p-6"
          >
            <PanelHeader
              id="catalog-crops-heading"
              icon={Store}
              title="Katalog per Komoditas"
              description="Total proyeksi 12 minggu, digabung dari seluruh koperasi mitra"
            />

            <ul className="mt-1 flex flex-col divide-y divide-border/60">
              {crops.map(crop => (
                <li key={crop.id}>
                  <Link
                    href={`/catalog?komoditas=${crop.id}`}
                    className={ROW}
                    aria-label={`Lihat katalog ${crop.name}`}
                  >
                    {/* `sm`, where the window list beside it uses `md`: same
                        crop, same hue, deliberately quieter. One is a summary
                        you scan to choose a crop, the other is the detail you
                        read to choose a week. */}
                    <CropMark name={crop.name} size="sm" />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground transition-colors group-hover/row:text-[var(--terrion-green-700)]">
                        {crop.name}
                      </span>
                      <span className="mt-1 block text-[0.6875rem] leading-tight text-muted-foreground">
                        {formatNumberId(crop.windows)} minggu panen
                        {' \u00b7 '}
                        {formatNumberId(crop.cooperatives.size)} koperasi
                      </span>
                    </span>

                    <span className="w-[4.5rem] shrink-0">
                      <Tonnage value={crop.tonnes} approx />
                      <ShareBar
                        value={crop.tonnes}
                        max={heaviestCrop}
                        colour={commodityStyle(crop.name).hue}
                        className="mt-1.5"
                      />
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-4 shrink-0 text-[var(--terrion-ink-faint)]/60 transition-all group-hover/row:translate-x-0.5 group-hover/row:text-[var(--terrion-green-700)]"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        </div>

        {/* Right: what the cooperatives have coming */}
        <section
          aria-labelledby="upcoming-supply-heading"
          style={riseDelay(120)}
          className="rise panel flex flex-col p-5 sm:p-6"
        >
          <PanelHeader
            id="upcoming-supply-heading"
            icon={Sprout}
            title="Pasokan Panen Siap Kontrak"
            description="Proyeksi panen terdekat dari gabungan kelompok tani mitra"
          />

          {soonest.length === 0 ? (
            <PanelEmpty
              title="Belum ada panen terproyeksi"
              body="Katalog akan otomatis terisi saat koperasi mitra mencatatkan jadwal tanam baru."
            />
          ) : (
            <ul className="mt-1 flex flex-col divide-y divide-border/60">
              {soonest.map(listing => {
                const crop = commodityStyle(listing.commodityName)

                return (
                  <li key={listing.id}>
                    <Link href={`/catalog/${listing.id}`} className={ROW}>
                      <CropMark name={listing.commodityName} size="md" />

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-foreground transition-colors group-hover/row:text-[var(--terrion-green-700)]">
                            {listing.commodityName}
                          </span>
                          {listing.varietyName && (
                            <span className="truncate text-[0.6875rem] text-muted-foreground">
                              {listing.varietyName}
                            </span>
                          )}
                          <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-px font-mono text-[0.625rem] font-semibold text-[var(--terrion-ink-soft)]">
                            {listing.isoWeek.replace(/^\d{4}-/, '')}
                          </span>
                        </span>
                        <RowMeta who={listing.cooperativeName} where={listing.district}>
                          {formatHarvestRange(listing.weekStart, listing.weekEnd)}
                        </RowMeta>
                      </span>

                      <span className="w-[4.5rem] shrink-0">
                        <Tonnage value={listing.tonnes} approx />
                        <ShareBar
                          value={listing.tonnes}
                          max={heaviest}
                          colour={crop.hue}
                          className="mt-1.5"
                        />
                      </span>
                      <ChevronRight
                        aria-hidden
                        className="size-4 shrink-0 text-[var(--terrion-ink-faint)]/60 transition-all group-hover/row:translate-x-0.5 group-hover/row:text-[var(--terrion-green-700)]"
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          <PanelFooterLink href="/catalog">
            Jelajahi seluruh katalog pasokan ({formatNumberId(cooperativeCount)} koperasi)
          </PanelFooterLink>
        </section>
      </div>
    </div>
  )
}

/**
 * One list row's geometry, shared by both panels so a request and a listing
 * are read the same way: mark, name, who and when, the figure, the way in.
 *
 * The negative margin lets the hover wash run past the panel's text column to
 * where a row visually ends, rather than stopping short of it in a box that
 * looks narrower than the divider above it.
 */
const ROW =
  'group/row interactive -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-[var(--terrion-green-50)]/70'

/** A row's second line: who is behind it, and the week it lands. */
function RowMeta({
  who,
  where,
  children,
}: {
  who: string
  where?: string
  children: ReactNode
}) {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6875rem] leading-tight text-muted-foreground">
      <span className="inline-flex min-w-0 items-center gap-1">
        <Building2 aria-hidden className="size-3 shrink-0 text-[var(--terrion-ink-faint)]" />
        <span className="truncate">{where ? `${who} · ${where}` : who}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[var(--terrion-ink-faint)]">
        <CalendarDays aria-hidden className="size-3 shrink-0" />
        {children}
      </span>
    </span>
  )
}

/** The figure at the end of a row: tonnes, with the unit kept quiet. */
function Tonnage({ value, approx = false }: { value: number; approx?: boolean }) {
  return (
    <span className="block shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
      {approx && <span className="text-muted-foreground">± </span>}
      {formatNumberId(value)}
      <span className="ml-0.5 text-[0.6875rem] font-medium text-muted-foreground">t</span>
    </span>
  )
}

/**
 * A panel's title bar. Both panels carried this markup separately and had
 * already drifted a half-rem apart in padding.
 */
function PanelHeader({
  id,
  icon: Icon,
  title,
  description,
  tag,
}: {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  /**
   * Optional, and now unused by both panels on this page: each printed a
   * figure the metric row above had already given -- "1 pengajuan" under
   * "Total permintaan 1", "± 63,3 t" under "Pasokan di katalog 63,3 t". A
   * number stated twice on one screen is not emphasis, it is noise.
   */
  tag?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/80 pb-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--terrion-green-50)] text-[var(--terrion-green-700)] ring-1 ring-inset ring-[var(--terrion-green-100)]"
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          {/* 600, not 700. globals.css: weights stop at 600 inside the
              product -- hierarchy here is carried by size, space and colour,
              and "a 700 on a dashboard is how that rule gets quietly broken". */}
          <h2 id={id} className="text-[0.9375rem] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      {tag && <span className="badge-tag shrink-0 tabular-nums">{tag}</span>}
    </div>
  )
}

/** What a panel shows instead of a list it has nothing to put in. */
function PanelEmpty({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
      <span className="text-xs font-semibold text-foreground">{title}</span>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">{body}</p>
      {action}
    </div>
  )
}

/** The way out of a panel, into the full screen behind it. */
function PanelFooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="interactive group/more -mx-2 mt-4 flex items-center justify-between gap-2 rounded-lg border-t border-border/80 px-2 pb-0.5 pt-3.5 text-xs font-semibold text-[var(--terrion-green-700)] hover:text-[var(--terrion-green-900)]"
    >
      {children}
      <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/more:translate-x-0.5" />
    </Link>
  )
}

/**
 * Cooperative-style Buyer Header using PageHeader
 */
export function BuyerHomeHeader({
  greeting,
  user,
}: {
  greeting: string
  user: { fullName: string; organisation: string | null }
}) {
  return (
    <PageHeader
      title={`${greeting}, ${firstName(user.fullName)}`}
      description={
        user.organisation ? (
          <>
            <strong className="font-semibold text-foreground">{user.organisation}</strong> — pantau status pengajuan kontrak pasokan dan proyeksi panen mitra koperasi Anda.
          </>
        ) : (
          'Pantau status pengajuan kontrak pasokan dan proyeksi panen mitra koperasi Anda.'
        )
      }
      actions={
        <div className="flex items-center gap-2.5">
          <Link
            href="/catalog"
            className={cn(
              buttonVariants({ variant: 'default', size: 'sm' }),
              'interactive gap-2 bg-[var(--terrion-green-700)] font-medium text-white shadow-xs hover:bg-[var(--terrion-green-900)]',
            )}
          >
            <Store className="size-4" />
            Jelajahi Katalog
          </Link>
          <Link
            href="/my-requests"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'interactive gap-2 font-medium hover:bg-[var(--terrion-green-50)]',
            )}
          >
            <FileText className="size-4 text-[var(--terrion-green-600)]" />
            Permintaan Saya
          </Link>
        </div>
      }
    />
  )
}

function riseDelay(ms: number): React.CSSProperties {
  return { '--rise-delay': `${ms}ms` } as React.CSSProperties
}

function firstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Pembeli'
  if (/^(pak|bu|ibu|mas|mbak|haji|hj)$/i.test(parts[0]) && parts[1]) {
    return `${parts[0]} ${parts[1]}`
  }
  return parts[0]
}

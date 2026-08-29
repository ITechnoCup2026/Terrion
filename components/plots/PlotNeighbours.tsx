import Link from 'next/link'

import { formatNumberId } from '@/lib/format/number'
import type { Neighbours } from '@/lib/plots/siblings'

/**
 * Moving between the plots of one cooperative, on the public page.
 *
 * The public plot page used to be a leaf: you arrived from the Atlas or from a
 * shared link, and the only way to the next field in the same village was back
 * out to the map and in again. Somebody shown their neighbour's page wants to
 * see the rest of the village, and there was nothing to click.
 *
 * Two ways through, because they answer different questions. Previous and next
 * are for reading the cooperative in order; the list is for going to one field
 * in particular. Neither wraps -- see `neighboursOf` for why.
 *
 * Renders nothing at all for a cooperative with one plot. A "1 dari 1" with
 * two dead buttons is worse than no control.
 */
export function PlotNeighbours({
  neighbours, cooperativeName, village,
}: {
  neighbours: Neighbours
  cooperativeName: string | null
  /** Named when the cooperative cannot be, so the heading is never anonymous. */
  village: string
}) {
  const { previous, next, others, position, total } = neighbours
  if (others.length === 0) return null

  const owner = cooperativeName ?? `Desa ${village}`

  return (
    <nav aria-label="Lahan lain di koperasi ini" className="mt-6 border-t border-border pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Lahan lain di {owner}</h2>
        {position > 0 && (
          <p className="text-xs tabular-nums text-muted-foreground">
            Lahan {position} dari {total}
          </p>
        )}
      </div>

      {/* Previous and next first: reading the cooperative in order is the
          commoner move, and it is one click rather than a scan. */}
      {(previous || next) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Step plot={previous} label="Lahan sebelumnya" />
          <Step plot={next} label="Lahan berikutnya" align="end" />
        </div>
      )}

      {/* A short cooperative lists inline; a long one folds away.
          Sumber Rejeki has forty-seven plots, and forty-six rows made this
          page two and a half thousand pixels tall — on a page whose whole
          reason for existing is a phone on a village connection. Every plot
          stays one tap away either way, and <details> needs no JavaScript to
          open. */}
      {others.length <= INLINE_LIMIT ? (
        <PlotList plots={others} className="mt-3" />
      ) : (
        <details className="group mt-3">
          <summary className="interactive cursor-pointer list-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-muted">
            Lihat {others.length} lahan lain
            <span className="ml-1 text-muted-foreground group-open:hidden">— buka daftar</span>
            <span className="ml-1 hidden text-muted-foreground group-open:inline">— tutup daftar</span>
          </summary>
          <PlotList plots={others} className="mt-2" />
        </details>
      )}
    </nav>
  )
}

/** Above this many, the list folds behind a summary. */
const INLINE_LIMIT = 8

/** The plots themselves, as one tappable row each. */
function PlotList({
  plots, className,
}: {
  plots: Neighbours['others']
  className?: string
}) {
  return (
    <ul className={`grid gap-2 sm:grid-cols-2 ${className ?? ''}`}>
      {plots.map(plot => (
        <li key={plot.publicId}>
          <Link
            href={`/garden/${plot.publicId}`}
            className="interactive flex items-baseline justify-between gap-3 rounded-lg border border-border
              bg-card px-3 py-2 transition-colors hover:border-input hover:bg-muted"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-foreground">{plot.name}</span>
              {plot.memberName && (
                <span className="block truncate text-xs text-muted-foreground">
                  {plot.memberName}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatNumberId(plot.areaHa)} ha
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * One step through the cooperative, or the empty slot where it would be.
 *
 * The slot is kept rather than collapsed so the pair does not jump sideways
 * between the first plot and the second — and the ends read as ends rather
 * than as a control that failed to render.
 */
function Step({
  plot, label, align = 'start',
}: {
  plot: { publicId: string; name: string } | null
  label: string
  align?: 'start' | 'end'
}) {
  const side = align === 'end' ? 'sm:text-right' : ''

  if (!plot) {
    return (
      <p className={`rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground ${side}`}>
        {label === 'Lahan sebelumnya' ? 'Lahan pertama' : 'Lahan terakhir'}
      </p>
    )
  }

  return (
    <Link
      href={`/garden/${plot.publicId}`}
      className={`interactive block rounded-lg border border-border bg-card px-3 py-2
        transition-colors hover:border-input hover:bg-muted ${side}`}
    >
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="block truncate text-sm font-medium text-foreground">{plot.name}</span>
    </Link>
  )
}

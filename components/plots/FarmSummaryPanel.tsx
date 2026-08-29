'use client'

import Link from 'next/link'

import { HarvestWindow } from '@/components/harvest/HarvestWindow'
import { Button } from '@/components/ui/button'
import { formatNumberId } from '@/lib/format/number'

/** Everything the farmhouse popup shows. Computed on the server, all measured. */
export type FarmSummary = {
  plotName: string
  memberName: string
  areaHa: number
  blockCount: number
  commodities: string[]
  publicId: string
  /** Yield range across every standing block, in tonnes. */
  tonnesMin: number
  tonnesMax: number
  window: { start: Date; end: Date; basis: 'observed' | 'climatology' } | null
}

/**
 * The plot as a whole, opened by clicking the farmhouse.
 *
 * The house itself is decoration -- smallholders' houses are frequently not on
 * the plot at all -- but it makes a natural anchor for the summary that the
 * block panel deliberately does not give: the totals across every block.
 *
 * Tonnage is a range because the varieties publish a range. A single number
 * here would be the only figure on the screen nobody measured.
 *
 * Contents only; AnchoredPanel owns the frame and puts it where the reader
 * clicked.
 */
export function FarmSummaryPanel({
  summary, degraded, onClose,
}: {
  summary: FarmSummary
  degraded: boolean
  onClose: () => void
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{summary.plotName}</p>
          <p className="text-xs text-muted-foreground">{summary.memberName}</p>
        </div>
        <Button variant="ghost" size="xs" onClick={onClose} aria-label="Tutup">✕</Button>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Luas total</dt>
          <dd className="text-foreground">{formatNumberId(summary.areaHa)} ha</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Jumlah blok</dt>
          <dd className="text-foreground">{summary.blockCount}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Komoditas</dt>
          <dd className="text-right text-foreground">{summary.commodities.join(', ')}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Perkiraan hasil</dt>
          <dd className="text-foreground">
            {formatNumberId(summary.tonnesMin)}–{formatNumberId(summary.tonnesMax)} ton
          </dd>
        </div>
      </dl>

      {summary.window && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1 text-xs text-muted-foreground">Rentang panen seluruh blok</p>
          <HarvestWindow week={summary.window} degraded={degraded} size="sm" />
        </div>
      )}

      <Link
        href={`/garden/${summary.publicId}`}
        className="mt-3 inline-block text-sm font-medium text-foreground underline underline-offset-2"
      >
        Lihat halaman publik
      </Link>
    </>
  )
}

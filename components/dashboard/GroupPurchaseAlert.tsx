import Link from 'next/link'

import { formatNumberId } from '@/lib/format/number'
import type { RequirementLine } from '@/lib/rdkk/aggregate'
import { cn } from '@/lib/utils'

/**
 * Flow D's entry point: the season's input requirement, already aggregated.
 *
 * Quantities are stated in tonnes when they run to thousands of kilos, since
 * "Urea 4.200 kg" is harder to hold in the head than "Urea 4,2 t". Anything
 * the cooperative planted that has no published rate is named rather than
 * silently dropped — a short total that looks complete is the failure mode
 * this guards against.
 */

// Kilograms read as tonnes past a thousand, and stay kilograms below it.
function quantity(kg: number): string {
  return kg >= 1000 ? `${formatNumberId(kg / 1000)} t` : `${formatNumberId(kg)} kg`
}

export function GroupPurchaseAlert({
  totals,
  plotCount,
  seasonLabel,
  commoditiesWithoutRates,
  className,
}: {
  totals: RequirementLine[]
  plotCount: number
  /** Which season these quantities were computed from, e.g. "musim ini". */
  seasonLabel: string
  commoditiesWithoutRates: string[]
  className?: string
}) {
  if (totals.length === 0) return null

  const summary = totals
    .map(line => `${line.inputItem} ${quantity(line.quantityKg)}`)
    .join(', ')

  return (
    <section
      className={cn('rounded-lg border border-border bg-card p-4', className)}
      aria-labelledby="rdkk-heading"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pembelian bersama
      </p>

      <h2 id="rdkk-heading" className="mt-1 text-sm font-medium text-foreground">
        Kebutuhan pupuk untuk {plotCount} lahan {seasonLabel} sudah diagregasi: {summary}.
      </h2>

      {commoditiesWithoutRates.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {commoditiesWithoutRates.length} komoditas belum punya acuan dosis, sehingga
          luasnya belum terhitung dalam angka di atas.
        </p>
      )}

      <Link
        href="/purchases"
        className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Siapkan dokumen RDKK
      </Link>
    </section>
  )
}

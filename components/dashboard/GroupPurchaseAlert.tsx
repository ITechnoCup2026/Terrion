import Link from 'next/link'

import { Composition, type CompositionPart } from '@/components/ui/Composition'
import { buttonVariants } from '@/components/ui/button'
import { formatNumberId } from '@/lib/format/number'
import type { RequirementLine } from '@/lib/rdkk/aggregate'
import { inputItemLabel } from '@/lib/rdkk/label'
import { cn } from '@/lib/utils'

/**
 * Flow D's entry point: the season's input requirement, already aggregated.
 *
 * It used to print the four quantities as a comma-joined sentence — "Kcl 0,3
 * ton, Npk 0,4 ton, Sp36 0,4 ton, Urea 1,3 ton" — so learning the thing a
 * pengurus actually wants, that urea is over half the order, meant adding four
 * figures up while reading. The bar says it before the panel is read.
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

  const parts: CompositionPart[] = totals.map(line => ({
    key: line.inputItem,
    label: inputItemLabel(line.inputItem),
    value: quantity(line.quantityKg),
    amount: line.quantityKg,
  }))

  const totalKg = totals.reduce((sum, line) => sum + line.quantityKg, 0)

  return (
    <section
      aria-labelledby="rdkk-heading"
      className={cn(
        'flex h-full flex-col rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-xs)]',
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="rdkk-heading" className="text-sm font-semibold text-foreground">
          Pembelian bersama
        </h2>
        <span className="shrink-0 text-[0.9375rem] font-medium tabular-nums text-foreground">
          {quantity(totalKg)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Kebutuhan pupuk {plotCount} lahan {seasonLabel}, sudah diagregasi
      </p>

      <Composition parts={parts} className="mt-4" />

      {commoditiesWithoutRates.length > 0 && (
        <p className="mt-3 text-[0.6875rem] leading-relaxed text-[var(--terrion-ink-faint)]">
          {commoditiesWithoutRates.length} komoditas belum punya acuan dosis, sehingga luasnya
          belum terhitung di angka ini.
        </p>
      )}

      {/* mt-auto: this panel sits beside a list of unknown length, so its one
          action settles onto the bottom of the pair rather than floating
          halfway up whichever panel happens to be shorter. */}
      <div className="mt-auto pt-5">
        <Link
          href="/purchases"
          className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
        >
          Siapkan dokumen RDKK
        </Link>
      </div>
    </section>
  )
}

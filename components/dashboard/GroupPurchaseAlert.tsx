import Link from 'next/link'

import { Composition, type CompositionPart } from '@/components/ui/Composition'
import { buttonVariants } from '@/components/ui/button'
import { formatNumberId } from '@/lib/format/number'
import type { RequirementLine } from '@/lib/rdkk/aggregate'
import { inputItemLabel } from '@/lib/rdkk/label'
import { cn } from '@/lib/utils'

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
        'panel flex h-full flex-col p-6 justify-between',
        className,
      )}
    >
      <div>
        <div className="flex items-baseline justify-between gap-3 border-b border-border/80 pb-3.5">
          <div>
            <h2 id="rdkk-heading" className="text-base font-bold tracking-tight text-foreground">
              Pembelian Bersama
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kebutuhan pupuk {plotCount} lahan {seasonLabel}, sudah diagregasi
            </p>
          </div>

          <span className="badge-tag font-mono">
            {quantity(totalKg)}
          </span>
        </div>


        <Composition parts={parts} className="mt-5" />

        {commoditiesWithoutRates.length > 0 && (
          <p className="mt-3.5 text-[0.6875rem] leading-relaxed text-[var(--terrion-ink-faint)] bg-[var(--terrion-green-50)]/50 p-2.5 rounded-lg border border-[#e1e8dd]">
            {commoditiesWithoutRates.length} komoditas belum punya acuan dosis, sehingga luasnya belum terhitung di angka ini.
          </p>
        )}
      </div>

      <div className="mt-6 pt-2">
        <Link
          href="/purchases"
          className={cn(
            buttonVariants({ variant: 'default', size: 'lg' }),
            'w-full justify-center pill-solid font-medium text-sm',
          )}
        >
          Siapkan Dokumen RDKK
        </Link>
      </div>
    </section>
  )
}




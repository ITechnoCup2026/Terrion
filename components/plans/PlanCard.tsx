'use client'

import { useState } from 'react'
import { ChevronDown, Sprout, TrendingUp, Warehouse } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/Card'
import { formatNumberId } from '@/lib/format/number'
import { formatRupiah } from '@/lib/format/rupiah'
import { OBJECTIVE_COPY, priceIsSynthetic, type Plan } from '@/lib/planning/plan'
import { cn } from '@/lib/utils'

const HEADLINE_ICON = {
  aman: Warehouse,
  pendapatan: TrendingUp,
  pasar: Sprout,
} as const

function tonnes(value: number): string {
  return `${formatNumberId(value)} t`
}

/**
 * The one number this plan is judged on, said plainly.
 *
 * Each objective leads with a different figure because each answers a
 * different question -- showing all three plans the same headline would make
 * them look like three attempts at one answer, which is exactly the reading
 * the product is trying to avoid.
 */
function headline(plan: Plan): { value: string; label: string } {
  const { metrics } = plan
  if (plan.objective === 'pendapatan') {
    return {
      value: metrics.grossValue === null ? 'Tidak tersedia' : formatRupiah(metrics.grossValue),
      label: 'Perkiraan nilai panen',
    }
  }
  if (plan.objective === 'pasar') {
    return {
      value: `${formatNumberId(metrics.demandCoveredKg)} kg`,
      label: 'Permintaan pembeli yang tertutup',
    }
  }
  return {
    value: tonnes(metrics.peakTonnesP90 ?? metrics.worstCasePeakTonnes),
    label: metrics.peakTonnesP90 === null
      ? 'Puncak panen pada musim terburuk'
      : 'Puncak mingguan, 9 dari 10 musim di bawah',
  }
}

export function PlanCard({
  plan,
  selected,
  onSelect,
  action,
}: {
  plan: Plan
  selected: boolean
  onSelect: () => void
  action?: React.ReactNode
}) {
  const [showRows, setShowRows] = useState(false)
  const copy = OBJECTIVE_COPY[plan.objective]
  const Icon = HEADLINE_ICON[plan.objective]
  const lead = headline(plan)
  const { metrics } = plan

  const overCapacity =
    metrics.capacityTonnesPerWeek !== null
    && (metrics.peakTonnesP90 ?? metrics.worstCasePeakTonnes) > metrics.capacityTonnesPerWeek

  return (
    <Card
      as="article"
      pad="lg"
      tone={overCapacity ? 'alert' : 'default'}
      className={cn(
        'flex flex-col gap-4 transition-shadow',
        selected && 'ring-2 ring-primary/50',
      )}
    >
      <button type="button" onClick={onSelect} className="text-left">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          <h3 className="text-base font-semibold tracking-tight">{copy.label}</h3>
          {selected && <Badge tone="positive">Dipilih</Badge>}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{copy.question}</p>
      </button>

      <div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{lead.value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{lead.label}</p>
        {overCapacity && (
          <p className="mt-2 text-xs text-[var(--terrion-gold-600)]">
            Melewati kapasitas tampung {tonnes(metrics.capacityTonnesPerWeek ?? 0)} per minggu.
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Total panen</dt>
          <dd className="tabular-nums">{tonnes(metrics.totalTonnes)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Lahan ditanami</dt>
          <dd className="tabular-nums">{formatNumberId(plan.assignments.length)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {metrics.peakTonnesP50 === null ? 'Puncak perkiraan' : 'Puncak tengah (P50)'}
          </dt>
          <dd className="tabular-nums">
            {tonnes(metrics.peakTonnesP50 ?? metrics.expectedPeakTonnes)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Nilai panen</dt>
          <dd className="tabular-nums">
            {metrics.grossValue === null ? '—' : formatRupiah(metrics.grossValue)}
          </dd>
        </div>
      </dl>

      {metrics.grossValue !== null && priceIsSynthetic(metrics) && (
        <p className="rounded-md bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          Panel harga acuan masih data sintetis, jadi angka rupiah di atas berguna untuk
          <strong className="font-medium"> membandingkan ketiga rencana</strong>, bukan sebagai
          nilai yang bisa dianggarkan.
        </p>
      )}

      {plan.narrative && (
        <div className="border-t border-border pt-4">
          <p className="text-sm leading-relaxed text-foreground">{plan.narrative}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {plan.narrativeSource === 'llm' ? 'Penjelasan AI' : 'Ringkasan otomatis'}
          </p>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
        <p className="text-xs leading-relaxed text-muted-foreground">{copy.detail}</p>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          aria-expanded={showRows}
          onClick={() => setShowRows(value => !value)}
        >
          <ChevronDown className={cn('transition-transform', showRows && 'rotate-180')} />
          {showRows ? 'Sembunyikan' : 'Lihat'} {formatNumberId(plan.assignments.length)} penugasan
        </Button>

        {showRows && (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-1 pr-3 font-medium">Lahan</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Tanam</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Panen</th>
                  <th scope="col" className="py-1 text-right font-medium">Perkiraan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plan.assignments.map(assignment => (
                  <tr key={assignment.candidateId}>
                    <td className="py-1.5 pr-3">{assignment.plotName}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{assignment.plantingDate}</td>
                    <td className="py-1.5 pr-3 tabular-nums">
                      {assignment.harvestStart} – {assignment.harvestEnd}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {formatNumberId(assignment.tonnesLow)}–{formatNumberId(assignment.tonnesHigh)} t
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {action}
      </div>
    </Card>
  )
}

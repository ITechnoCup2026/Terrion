'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, CheckCircle2, Cpu, Loader2, ServerOff } from 'lucide-react'

import { PlanCard } from '@/components/plans/PlanCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeading } from '@/components/ui/Page'
import { applyPlan, proposePlan } from '@/app/actions/plan'
import { formatNumberId } from '@/lib/format/number'
import { ENGINE_COPY, type PlanObjective, type PlanProposal } from '@/lib/planning/plan'

/** October to March is the wet-season planting window most of Java plans around. */
function defaultSeason(): { label: string; start: string; end: string } {
  const today = new Date()
  const year = today.getUTCMonth() >= 9 ? today.getUTCFullYear() + 1 : today.getUTCFullYear()
  return {
    label: `MT I ${year - 1}/${year}`,
    start: `${year - 1}-10-01`,
    end: `${year}-03-31`,
  }
}

export function PlanWorkspace({ canApply }: { canApply: boolean }) {
  const initial = defaultSeason()

  const [label, setLabel] = useState(initial.label)
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)

  const [proposal, setProposal] = useState<PlanProposal | null>(null)
  const [selected, setSelected] = useState<PlanObjective>('aman')
  const [message, setMessage] = useState<string | null>(null)
  const [applied, setApplied] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setMessage(null)
    setApplied(null)

    startTransition(async () => {
      const result = await proposePlan({ seasonLabel: label, seasonStart: start, seasonEnd: end })
      if (result.ok) {
        setProposal(result.data)
        setSelected(result.data.plans[0]?.objective ?? 'aman')
      } else {
        setProposal(null)
        setMessage(result.message)
      }
    })
  }

  function commit(objective: PlanObjective) {
    setMessage(null)

    startTransition(async () => {
      const result = await applyPlan({
        seasonLabel: label, seasonStart: start, seasonEnd: end, objective,
      })
      if (result.ok) {
        setApplied(
          result.data.replacedExisting
            ? `Rencana diterapkan: ${formatNumberId(result.data.blocksCreated)} blok dibuat, `
              + 'menggantikan rencana musim ini yang sebelumnya berlaku.'
            : `Rencana diterapkan: ${formatNumberId(result.data.blocksCreated)} blok dibuat.`,
        )
      } else {
        setMessage(result.message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card as="section" pad="lg">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-48 flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Nama musim</span>
            <input
              value={label}
              onChange={event => setLabel(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              maxLength={60}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Mulai tanam</span>
            <input
              type="date"
              value={start}
              onChange={event => setStart(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2.5 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Akhir musim</span>
            <input
              type="date"
              value={end}
              onChange={event => setEnd(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2.5 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              required
            />
          </label>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {proposal ? 'Susun ulang' : 'Susun rencana'}
          </Button>
        </form>
      </Card>

      {message && (
        <Card as="section" pad="md" tone="alert" className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--terrion-gold-600)]" aria-hidden />
          <p className="text-sm leading-relaxed">{message}</p>
        </Card>
      )}

      {applied && (
        <Card as="section" pad="md" className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--terrion-green-700)]" aria-hidden />
          <p className="text-sm leading-relaxed">{applied}</p>
        </Card>
      )}

      {!proposal && !pending && (
        <EmptyState
          title="Belum ada rencana yang disusun"
          description="Pilih rentang musim di atas, lalu susun tiga rencana untuk dibandingkan."
        />
      )}

      {proposal && (
        <>
          <Card as="section" pad="md" className="flex flex-wrap items-start gap-3">
            {proposal.engine === 'ai-service'
              ? <Cpu className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              : <ServerOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {ENGINE_COPY[proposal.engine].label}
                </span>
                <Badge tone={proposal.engine === 'ai-service' ? 'positive' : 'neutral'}>
                  {proposal.engine}
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {ENGINE_COPY[proposal.engine].detail}
              </p>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                {formatNumberId(proposal.candidateCount)} kombinasi tanam dipertimbangkan
                {proposal.evaluations > 0
                  && ` · ${formatNumberId(proposal.evaluations)} evaluasi`}
              </p>
            </div>
          </Card>

          <div>
            <SectionHeading>Tiga rencana untuk {proposal.season.label}</SectionHeading>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Ini tiga titik ekstrem dari trade-off yang sama, bukan tiga rencana terbaik.
              Masing-masing menjawab pertanyaan yang berbeda — pengurus memilih pertanyaan
              mana yang paling penting musim ini.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {proposal.plans.map(plan => (
              <PlanCard
                key={plan.objective}
                plan={plan}
                selected={selected === plan.objective}
                onSelect={() => setSelected(plan.objective)}
                action={canApply && plan.assignments.length > 0 && (
                  <Button
                    type="button"
                    variant={selected === plan.objective ? 'default' : 'outline'}
                    disabled={pending}
                    onClick={() => commit(plan.objective)}
                  >
                    {pending && <Loader2 className="animate-spin" />}
                    Terapkan rencana ini
                  </Button>
                )}
              />
            ))}
          </div>

          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Menyusun rencana tidak menyimpan apa pun. Blok baru hanya dibuat ketika pengurus
            menekan “Terapkan rencana ini”, dan menerapkan rencana kedua untuk musim yang sama
            akan menggantikan yang pertama — kecuali blok yang panennya sudah dicatat.
          </p>
        </>
      )}
    </div>
  )
}

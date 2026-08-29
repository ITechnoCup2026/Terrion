'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

import { splitBlock } from '@/app/actions/block'
import { Button } from '@/components/ui/button'
import { planSplit, splitBlockSchema, type SplitBlockInput } from '@/lib/schemas/block'
import { MIN_PLANTING_HA } from '@/lib/schemas/plot'

export type ReferenceCommodity = { id: string; name: string }
export type ReferenceVariety = { id: string; commodity_id: string; name: string }

type FormValues = z.input<typeof splitBlockSchema>

const field = 'w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm ' +
  'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const label = 'block text-xs font-medium text-muted-foreground mb-1'
const errorText = 'mt-1 text-xs text-destructive'

const ha = (n: number) => n.toFixed(2).replace('.', ',')

/**
 * Carves part of a standing block off and plants something else on it.
 *
 * Lives inside the block's own popover rather than on a page of its own,
 * because the question it answers -- "what else goes on this piece of ground?"
 * -- is about the tile that was just clicked.
 *
 * The refusals are `planSplit`'s, the same function the Server Action uses, so
 * the form and the server cannot disagree about what is possible.
 */
export function SplitBlockForm({
  blockId, blockLabel, blockAreaHa, commodities, varieties, onDone, onCancel,
}: {
  blockId: string
  blockLabel: string
  blockAreaHa: number
  commodities: ReferenceCommodity[]
  varieties: ReferenceVariety[]
  onDone: () => void
  onCancel: () => void
}) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const maxHa = Math.round((blockAreaHa - MIN_PLANTING_HA) * 1e4) / 1e4

  const {
    register, handleSubmit, watch, setValue, formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, SplitBlockInput>({
    resolver: zodResolver(splitBlockSchema),
    defaultValues: {
      blockId,
      // Half by default: splitting a field in two is the common case, and it
      // is the one number that needs no thought to check.
      areaHa: String(Math.max(MIN_PLANTING_HA, Math.round(blockAreaHa * 50) / 100)),
      commodityId: '', varietyId: '', plantingDate: '',
    } as unknown as FormValues,
  })

  const commodityId = watch('commodityId')
  const shown = varieties.filter(v => v.commodity_id === commodityId)

  // The same arithmetic the action will run, so the reader sees the refusal
  // before submitting rather than after.
  const plan = planSplit(blockAreaHa, Number(watch('areaHa')) || 0)

  const onSubmit = handleSubmit(async values => {
    setSubmitError(null)
    try {
      const result = await splitBlock(values)
      if (!result.ok) { setSubmitError(result.message); return }
      // The page is server-rendered from the blocks, so refreshing is what
      // redraws the farm with its new field in it.
      router.refresh()
      onDone()
    } catch {
      setSubmitError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Pecah {blockLabel}</p>
        <p className="text-xs text-muted-foreground">
          {ha(blockAreaHa)} ha · maksimal {ha(maxHa)} ha bisa dipecah
        </p>
      </div>

      <div>
        <label className={label} htmlFor="split-areaHa">Luas tanaman baru (ha)</label>
        <input id="split-areaHa" className={field} type="number" step="0.01" inputMode="decimal"
          {...register('areaHa')} />
        {plan.ok && (
          <p className="mt-1 text-xs text-muted-foreground">
            Sisa untuk tanaman lama: {ha(plan.keptHa)} ha
          </p>
        )}
        {!plan.ok && <p className={errorText}>{plan.refusal}</p>}
      </div>

      <div>
        <label className={label} htmlFor="split-commodityId">Komoditas</label>
        <select id="split-commodityId" className={field} {...register('commodityId')}
          onChange={e => {
            setValue('commodityId', e.target.value, { shouldValidate: true })
            setValue('varietyId', '', { shouldValidate: false })
          }}>
          <option value="">Pilih komoditas</option>
          {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {errors.commodityId && <p className={errorText}>{errors.commodityId.message}</p>}
      </div>

      <div>
        <label className={label} htmlFor="split-varietyId">Varietas</label>
        <select id="split-varietyId" className={field} disabled={!commodityId}
          {...register('varietyId')}>
          <option value="">{commodityId ? 'Pilih varietas' : 'Pilih komoditas dulu'}</option>
          {shown.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        {errors.varietyId && <p className={errorText}>{errors.varietyId.message}</p>}
      </div>

      <div>
        <label className={label} htmlFor="split-plantingDate">Tanggal tanam</label>
        <input id="split-plantingDate" className={field} type="date"
          {...register('plantingDate')} />
        {errors.plantingDate && <p className={errorText}>{errors.plantingDate.message}</p>}
      </div>

      {submitError && (
        <p className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          {submitError}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting || !plan.ok}>
          {isSubmitting ? 'Menyimpan…' : 'Pecah blok'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Batal</Button>
      </div>
    </form>
  )
}

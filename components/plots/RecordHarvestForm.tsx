'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

import { recordHarvest } from '@/app/actions/harvest'
import { Button } from '@/components/ui/button'
import {
  calibrationCrop, describeOffset, type Calibration,
} from '@/lib/calibration/model'
import { checkHarvest, recordHarvestSchema, type RecordHarvestInput } from '@/lib/schemas/harvest'

type FormValues = z.input<typeof recordHarvestSchema>

const field = 'w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm ' +
  'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const label = 'block text-xs font-medium text-muted-foreground mb-1'
const errorText = 'mt-1 text-xs text-destructive'

/**
 * Records what actually came off a block.
 *
 * Lives in the block's own popover for the same reason the split form does:
 * the question it answers is about the field that was just clicked.
 *
 * It has two faces. Before submitting it is four inputs, two of them optional.
 * Afterwards it is a receipt -- what the cooperative's own harvests have now
 * taught the predictor about this variety. That second face is the point of the
 * whole feature: without it a kader types a number into a form and nothing
 * visible happens, and the fact that the next prediction just got sharper stays
 * buried in a table nobody opens.
 */
export function RecordHarvestForm({
  blockId, blockLabel, commodityName, plantingDate, onDone, onCancel,
}: {
  blockId: string
  blockLabel: string
  commodityName: string
  /** The block's planting date, so a harvest before it is refused here rather
   *  than after a round trip. */
  plantingDate: Date
  onDone: () => void
  onCancel: () => void
}) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [recorded, setRecorded] = useState<{ calibration: Calibration | null } | null>(null)

  const {
    register, handleSubmit, watch, formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, RecordHarvestInput>({
    resolver: zodResolver(recordHarvestSchema),
    defaultValues: {
      blockId,
      // Today, because a harvest is nearly always recorded on the day it
      // happens, and a date already in the box is one fewer thing to type on a
      // phone standing in a field.
      harvestDate: new Date().toISOString().slice(0, 10),
      yieldKg: '', pricePerKg: '', paymentDate: '',
    } as unknown as FormValues,
  })

  // The same rules the action will apply, so a refusal shows before submitting.
  const refusal = checkHarvest({
    plantingDate,
    harvestDate: parseDate(watch('harvestDate')),
    paymentDate: parseDate(watch('paymentDate')),
  })

  const onSubmit = handleSubmit(async values => {
    setSubmitError(null)
    try {
      const result = await recordHarvest(values)
      if (!result.ok) { setSubmitError(result.message); return }
      // The page is server-rendered from the blocks, and a recorded block stops
      // being a standing one -- so this is what takes it off the farm.
      router.refresh()
      setRecorded({ calibration: result.data.calibration })
    } catch {
      setSubmitError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    }
  })

  if (recorded) {
    return <HarvestRecorded calibration={recorded.calibration} onDone={onDone} />
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Catat panen {blockLabel}</p>
        <p className="text-xs text-muted-foreground">{commodityName}</p>
      </div>

      <div>
        <label className={label} htmlFor="harvest-date">Tanggal panen</label>
        <input id="harvest-date" className={field} type="date" {...register('harvestDate')} />
        {errors.harvestDate && <p className={errorText}>{errors.harvestDate.message}</p>}
      </div>

      <div>
        <label className={label} htmlFor="harvest-yield">Hasil panen (kg)</label>
        <input id="harvest-yield" className={field} type="number" step="1" inputMode="decimal"
          placeholder="misal 7400" {...register('yieldKg')} />
        {errors.yieldKg && <p className={errorText}>{errors.yieldKg.message}</p>}
      </div>

      <div>
        <label className={label} htmlFor="harvest-price">
          Harga jual per kg <span className="font-normal">(opsional)</span>
        </label>
        <input id="harvest-price" className={field} type="number" step="1" inputMode="decimal"
          placeholder="misal 5200" {...register('pricePerKg')} />
        {errors.pricePerKg && <p className={errorText}>{errors.pricePerKg.message}</p>}
      </div>

      <div>
        <label className={label} htmlFor="harvest-payment">
          Tanggal pembayaran <span className="font-normal">(opsional)</span>
        </label>
        <input id="harvest-payment" className={field} type="date" {...register('paymentDate')} />
        <p className="mt-1 text-xs text-muted-foreground">
          Kosongkan jika pembeli belum membayar.
        </p>
      </div>

      {refusal && <p className={errorText}>{refusal}</p>}
      {submitError && <p className={errorText}>{submitError}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting || refusal !== null}>
          {isSubmitting ? 'Menyimpan…' : 'Simpan'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  )
}

/**
 * What the entry just changed.
 *
 * The wording is careful about which number is which. `offset_days` is what the
 * recorded harvests say on their own; `applied_offset_days` is how far the
 * prediction actually moves, after the estimate is shrunk toward the base model
 * by how few harvests back it. Showing the applied figure and the count
 * together is what stops "the model learned" from sounding like a claim that
 * one harvest rewrote it.
 */
function HarvestRecorded({
  calibration, onDone,
}: {
  calibration: Calibration | null
  onDone: () => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Panen tercatat</p>
        <p className="text-xs text-muted-foreground">
          Blok ini sudah selesai dan tidak lagi tampil di lahan.
        </p>
      </div>

      {calibration ? (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <p className="text-xs font-medium text-muted-foreground">
            Model belajar dari panen Anda
          </p>
          <p className="mt-1.5 text-sm text-foreground">
            {calibrationCrop(calibration)}
            {' — perkiraan panen berikutnya digeser '}
            <span className="font-semibold tabular-nums">
              {describeOffset(calibration.appliedOffsetDays)}
            </span>
            .
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Dari {calibration.nObservations} panen tercatat di koperasi ini.
            {calibration.nObservations < 5
              && ' Semakin banyak panen dicatat, semakin besar penyesuaiannya.'}
          </p>
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          Ini panen pertama yang tercatat untuk varietas ini. Setelah beberapa
          panen, perkiraan akan menyesuaikan dengan kebiasaan lahan di sini.
        </p>
      )}

      <Button size="sm" onClick={onDone}>Selesai</Button>
    </div>
  )
}

/** An <input type="date"> value, or null while it is empty or half-typed. */
function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value === '') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

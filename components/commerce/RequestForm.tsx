'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

import { createSupplyRequest } from '@/app/actions/supply-request'
import { RequestConfirmation } from '@/components/commerce/RequestConfirmation'
import { Button } from '@/components/ui/button'
import { DELIVERY_PREFERENCES, overVolumeWarning } from '@/lib/catalog/copy'
import { createSupplyRequestSchema, type CreateSupplyRequestInput } from '@/lib/schemas/supply-request'
import { cn } from '@/lib/utils'

type FormValues = z.input<typeof createSupplyRequestSchema>

const field = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ' +
  'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const label = 'block text-sm font-medium text-foreground mb-1.5'
const errorText = 'mt-1 text-xs text-destructive'

export function RequestForm({
  listingId, projectedTonnes, className,
}: {
  listingId: string
  projectedTonnes: number
  className?: string
}) {
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register, handleSubmit, watch, formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, CreateSupplyRequestInput>({
    resolver: zodResolver(createSupplyRequestSchema),
    defaultValues: {
      listingId,
      volumeTonnes: '' as unknown as number,
      deliveryPreference: 'belum_ditentukan',
      notes: '',
    },
  })

  // Asking for more than is projected is allowed -- the projection is an
  // estimate and the cooperative decides -- but the buyer is told.
  const requested = Number(watch('volumeTonnes'))
  const overAsking = Number.isFinite(requested) && requested > projectedTonnes

  const onSubmit = handleSubmit(async values => {
    setSubmitError(null)
    try {
      const result = await createSupplyRequest(values)
      if (!result.ok) { setSubmitError(result.message); return }
      setSent(true)
    } catch {
      setSubmitError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    }
  })

  if (sent) return <div className={className}><RequestConfirmation /></div>

  return (
    <form onSubmit={onSubmit} className={cn('space-y-4', className)}>
      <p className="text-sm font-semibold text-foreground">Ajukan kontrak pasokan</p>

      <input type="hidden" {...register('listingId')} />

      <div>
        <label className={label} htmlFor="volumeTonnes">Volume (ton)</label>
        <input
          id="volumeTonnes" type="number" step="0.1" min="0" className={field}
          {...register('volumeTonnes')}
        />
        {errors.volumeTonnes && <p className={errorText}>{errors.volumeTonnes.message}</p>}
        {overAsking && (
          <p className="mt-1 text-xs text-muted-foreground">
            {overVolumeWarning(requested, projectedTonnes)}
          </p>
        )}
      </div>

      <div>
        <label className={label} htmlFor="deliveryPreference">Preferensi pengiriman</label>
        <select id="deliveryPreference" className={field} {...register('deliveryPreference')}>
          {DELIVERY_PREFERENCES.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={label} htmlFor="notes">Catatan (opsional)</label>
        <textarea id="notes" rows={3} className={field} {...register('notes')} />
        {errors.notes && <p className={errorText}>{errors.notes.message}</p>}
      </div>

      {submitError && <p className={errorText}>{submitError}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Mengirim…' : 'Ajukan kontrak pasokan'}
      </Button>
    </form>
  )
}

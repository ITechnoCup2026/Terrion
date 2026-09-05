'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, Check, Loader2, Send, Truck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

import { createSupplyRequest } from '@/app/actions/supply-request'
import { RequestConfirmation } from '@/components/commerce/RequestConfirmation'
import { Button } from '@/components/ui/button'
import { DELIVERY_PREFERENCES, overVolumeWarning } from '@/lib/catalog/copy'
import { formatNumberId } from '@/lib/format/number'
import { createSupplyRequestSchema, type CreateSupplyRequestInput } from '@/lib/schemas/supply-request'
import { cn } from '@/lib/utils'

type FormValues = z.input<typeof createSupplyRequestSchema>

const field =
  'w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground ' +
  'transition-all outline-none focus:border-ring focus:ring-2 focus:ring-ring/25'
const label = 'block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5'
const errorText = 'mt-1.5 text-xs font-medium text-destructive flex items-center gap-1'

export function RequestForm({
  listingId,
  projectedTonnes,
  className,
}: {
  listingId: string
  projectedTonnes: number
  className?: string
}) {
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, CreateSupplyRequestInput>({
    resolver: zodResolver(createSupplyRequestSchema),
    defaultValues: {
      listingId,
      volumeTonnes: '' as unknown as number,
      deliveryPreference: 'belum_ditentukan',
      notes: '',
    },
  })

  const rawRequested = watch('volumeTonnes')
  const requested = Number(rawRequested)
  const isRequestedValid = Number.isFinite(requested) && requested > 0
  const overAsking = isRequestedValid && requested > projectedTonnes
  const percentage = isRequestedValid && projectedTonnes > 0
    ? Math.min(Math.round((requested / projectedTonnes) * 100), 100)
    : 0

  const handlePercentagePick = (ratio: number) => {
    const val = Number((projectedTonnes * ratio).toFixed(1))
    setValue('volumeTonnes', val, { shouldValidate: true })
  }

  const onSubmit = handleSubmit(async values => {
    setSubmitError(null)
    try {
      const result = await createSupplyRequest(values)
      if (!result.ok) {
        setSubmitError(result.message)
        return
      }
      setSent(true)
    } catch {
      setSubmitError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    }
  })

  if (sent) {
    return (
      <div className={className}>
        <RequestConfirmation />
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={cn('space-y-5', className)}>
      <input type="hidden" {...register('listingId')} />

      {/* Volume Input Section */}
      <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className={label} htmlFor="volumeTonnes">
            Volume yang Dibutuhkan (Ton)
          </label>
          <span className="text-xs text-muted-foreground">
            Total Proyeksi: <strong className="text-foreground">{formatNumberId(projectedTonnes)} ton</strong>
          </span>
        </div>

        <div className="relative">
          <input
            id="volumeTonnes"
            type="number"
            step="0.1"
            min="0"
            placeholder="Contoh: 2.5"
            className={cn(field, 'pr-14 text-base font-semibold')}
            {...register('volumeTonnes')}
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground uppercase">
            Ton
          </span>
        </div>

        {/* Quick percentage buttons */}
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-[0.6875rem] font-medium text-muted-foreground mr-1">Pintasan:</span>
          {[
            { label: '25%', ratio: 0.25 },
            { label: '50%', ratio: 0.5 },
            { label: '75%', ratio: 0.75 },
            { label: '100% (Semua)', ratio: 1.0 },
          ].map(btn => (
            <button
              key={btn.label}
              type="button"
              onClick={() => handlePercentagePick(btn.ratio)}
              className="interactive rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-[var(--terrion-green-100)] hover:text-[var(--terrion-green-700)] hover:border-[var(--terrion-green-300)]"
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Capacity Share Indicator */}
        {isRequestedValid && (
          <div className="mt-3 pt-3 border-t border-border/60">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Alokasi dari total panen:</span>
              <span className={cn('font-bold tabular-nums', overAsking ? 'text-[var(--terrion-gold-600)]' : 'text-[var(--terrion-green-700)]')}>
                {overAsking ? `${Math.round((requested / projectedTonnes) * 100)}% (Melebihi estimasi)` : `${percentage}%`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className={cn('h-full transition-all duration-300', overAsking ? 'bg-[var(--terrion-gold-500)]' : 'bg-[var(--terrion-green-600)]')}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {errors.volumeTonnes && (
          <p className={errorText}>
            <AlertCircle className="size-3.5 shrink-0" />
            {errors.volumeTonnes.message}
          </p>
        )}

        {overAsking && (
          <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-[var(--terrion-gold-50)] p-2.5 text-xs text-[var(--terrion-gold-600)] border border-[var(--terrion-gold-200)]">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{overVolumeWarning(requested, projectedTonnes)}</span>
          </div>
        )}
      </div>

      {/* Delivery Preference */}
      <div>
        <label className={label} htmlFor="deliveryPreference">
          <span className="flex items-center gap-1.5">
            <Truck className="size-3.5" />
            Preferensi Serah Terima & Pengiriman
          </span>
        </label>
        <select id="deliveryPreference" className={field} {...register('deliveryPreference')}>
          {DELIVERY_PREFERENCES.map(p => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[0.6875rem] text-muted-foreground">
          Lokasi gudang atau titik temu logistik dapat dikoordinasikan setelah pengajuan disetujui.
        </p>
      </div>

      {/* Notes / Special Requests */}
      <div>
        <label className={label} htmlFor="notes">
          Catatan Tambahan & Spesifikasi Kebutuhan (Opsional)
        </label>
        <textarea
          id="notes"
          rows={3}
          placeholder="Misal: Standar kadar air tertentu, kemasan karung 50kg, atau preferensi jadwal armada pengangkut..."
          className={cn(field, 'resize-y')}
          {...register('notes')}
        />
        {errors.notes && (
          <p className={errorText}>
            <AlertCircle className="size-3.5 shrink-0" />
            {errors.notes.message}
          </p>
        )}
      </div>

      {submitError && (
        <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[var(--terrion-green-700)] text-white hover:bg-[var(--terrion-green-900)] font-semibold shadow-sm h-11 text-sm"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Mengirimkan Pengajuan Kontrak…
          </>
        ) : (
          <>
            <Send className="mr-2 size-4" />
            Ajukan Kontrak Pasokan Sekarang
          </>
        )}
      </Button>

      <p className="text-center text-[0.6875rem] text-muted-foreground">
        Tidak ada biaya perantara. Koperasi memiliki hak prerogatif penuh untuk menyetujui atau menyesuaikan alokasi tonase.
      </p>
    </form>
  )
}

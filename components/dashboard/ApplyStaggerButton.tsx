'use client'

import { useState } from 'react'

import { applyStagger } from '@/app/actions/stagger'
import { Button } from '@/components/ui/button'

/**
 * Accepts the staggering suggestion the alert is showing.
 *
 * A Client Component for the same reason as CreateOrderButton: the likeliest
 * outcome is a refusal — the detector reasons about harvest windows, so it will
 * suggest shifting land that was planted months ago — and that refusal belongs
 * next to the button, not in the error boundary.
 */
export function ApplyStaggerButton({
  isoWeek,
  commodityId,
}: {
  isoWeek: string
  commodityId: string
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState<number | null>(null)

  const submit = async () => {
    setPending(true)
    setError(null)
    try {
      const result = await applyStagger({ isoWeek, commodityId })
      // The refusal arrives as a value now. As a throw it reached production
      // as "Minified React error #441", so the reason this button most often
      // gives -- the blocks are already planted -- was never actually read.
      if (!result.ok) { setError(result.message); return }
      setApplied(result.data.shifted)
    } catch {
      setError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    } finally {
      setPending(false)
    }
  }

  if (applied !== null) {
    return (
      <p className="mt-3 text-xs text-foreground">
        {applied} tanam digeser. Dampaknya muncul di &quot;Tonase dipindahkan&quot;.
      </p>
    )
  }

  return (
    <div className="mt-3">
      <Button type="button" variant="outline" onClick={submit} disabled={pending}>
        {pending ? 'Menerapkan…' : 'Terapkan penggeseran'}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

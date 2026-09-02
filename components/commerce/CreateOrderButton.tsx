'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createInputOrder } from '@/app/actions/input-order'
import { Button } from '@/components/ui/button'

/**
 * Turns this season's aggregated requirement into a draft purchase.
 *
 * A Client Component only so the failure can be shown next to the button that
 * caused it. A bare Server Action form would throw the whole screen into the
 * error boundary, which is far more alarming than "there is nothing to order".
 */
export function CreateOrderButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setPending(true)
    setError(null)
    try {
      const result = await createInputOrder()
      if (!result.ok) setError(result.message)
      // The new draft otherwise sits invisible: nothing on this Server
      // Component page re-fetches on its own just because a Client
      // Component next to it finished a request.
      else router.refresh()
    } catch {
      setError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <Button type="button" onClick={submit} disabled={pending || disabled}>
        {pending ? 'Menyimpan…' : 'Buat pesanan kelompok'}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

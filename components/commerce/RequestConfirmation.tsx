import Link from 'next/link'

import { LEGAL_FRAMING } from '@/lib/catalog/copy'

/**
 * Shown after a request is sent.
 *
 * The legal framing is the point of this screen, not a footnote: it is the only
 * moment a buyer is told, in the product itself, that Terrion does not stand
 * behind the delivery.
 */
export function RequestConfirmation() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-xs)]">
      <p className="text-sm font-semibold text-foreground">Permintaan terkirim</p>
      <p className="mt-2 text-sm text-muted-foreground">{LEGAL_FRAMING}</p>
      <Link
        href="/catalog"
        className="mt-4 inline-block text-sm font-medium text-foreground underline"
      >
        Kembali ke katalog
      </Link>
    </div>
  )
}

import { CheckCircle2, ClipboardList, Store } from 'lucide-react'
import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { LEGAL_FRAMING } from '@/lib/catalog/copy'
import { cn } from '@/lib/utils'

/**
 * Enhanced Confirmation Card shown after a buyer submits a supply contract request.
 */
export function RequestConfirmation() {
  return (
    <div className="rounded-2xl border border-[var(--terrion-green-300)]/80 bg-gradient-to-br from-[var(--terrion-green-50)]/90 to-card p-6 shadow-md text-center sm:p-8">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--terrion-green-100)] text-[var(--terrion-green-700)] ring-8 ring-[var(--terrion-green-50)]">
        <CheckCircle2 className="size-8" />
      </div>

      <h3 className="mt-4 text-xl font-bold tracking-tight text-foreground">
        Pengajuan Kontrak Berhasil Terkirim!
      </h3>

      <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        Pengurus koperasi telah menerima notifikasi permohonan Anda dan akan meninjau ketersediaan panen untuk disetujui.
      </p>

      <div className="mx-auto mt-5 max-w-lg rounded-xl border border-border/80 bg-background/80 p-3.5 text-left text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground block mb-0.5">Ketentuan Transaksi:</span>
        {LEGAL_FRAMING}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/my-requests"
          className={cn(buttonVariants({ size: 'default' }), 'bg-[var(--terrion-green-700)] text-white hover:bg-[var(--terrion-green-900)] font-medium')}
        >
          <ClipboardList className="mr-2 size-4" />
          Lihat di Permintaan Saya
        </Link>
        <Link
          href="/catalog"
          className={buttonVariants({ variant: 'outline', size: 'default' })}
        >
          <Store className="mr-2 size-4" />
          Lanjut Jelajahi Katalog
        </Link>
      </div>
    </div>
  )
}

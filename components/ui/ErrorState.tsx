'use client'

import { buttonVariants } from '@/components/ui/button'

/**
 * What a reader sees when a page throws.
 *
 * Without this Next shows its own error screen: English, unstyled, and in
 * production a bare "an error occurred" with no way forward. A cooperative
 * board member hitting that during a harvest week has no idea whether to wait,
 * retry or call someone.
 *
 * The message itself is never shown. Server errors reach the client redacted
 * anyway, and the raw text of the ones that do survive tends to be a Postgres
 * or Supabase string that tells a farmer nothing.
 */
export function ErrorState({
  retry, digest, description,
}: {
  retry: () => void
  digest?: string
  description?: string
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm font-semibold text-foreground">Halaman ini gagal dimuat</p>
        <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
          {description ?? 'Terjadi kesalahan saat mengambil data. Coba muat ulang.'}
        </p>

        <button type="button" onClick={retry} className={`${buttonVariants()} mt-4`}>
          Coba lagi
        </button>

        {/* The only thing worth showing: it is what a maintainer greps for. */}
        {digest && (
          <p className="mt-4 font-mono text-xs text-muted-foreground">Kode: {digest}</p>
        )}
      </div>
    </div>
  )
}

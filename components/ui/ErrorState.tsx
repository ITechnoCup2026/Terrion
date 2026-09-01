'use client'

import { buttonVariants } from '@/components/ui/button'
import { MessageCard } from '@/components/ui/Card'
import { Page } from '@/components/ui/Page'

/**
 * What a reader sees when a page throws.
 *
 * Without this Next shows its own error screen: English, unstyled, and in
 * production a bare "an error occurred" with no way forward. A cooperative
 * board member hitting that during a harvest week has no idea whether to wait,
 * retry or call someone.
 *
 * The message itself is never shown. Server errors reach the client redacted
 * anyway, and the raw text of the ones that do survive is a backend error code
 * -- `http_502`, `internal` -- which tells a farmer nothing.
 */
export function ErrorState({
  retry, digest, description,
}: {
  retry: () => void
  digest?: string
  description?: string
}) {
  return (
    <Page className="flex flex-1 items-center justify-center">
      <MessageCard
        className="w-full"
        title="Halaman ini gagal dimuat"
        action={
          <button type="button" onClick={retry} className={buttonVariants()}>
            Coba lagi
          </button>
        }
        // The digest is the only thing worth showing: it is what a maintainer
        // greps the server logs for.
        footnote={digest ? <span className="font-mono">Kode: {digest}</span> : undefined}
      >
        {description ?? 'Data tidak bisa diambil dari server. Coba lagi sebentar lagi.'}
      </MessageCard>
    </Page>
  )
}

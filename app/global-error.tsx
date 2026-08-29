'use client'

import { ErrorState } from '@/components/ui/ErrorState'

/**
 * The last resort: an error thrown by the root layout itself, where no other
 * boundary is mounted. It has to render its own html and body.
 */
export default function GlobalError({
  error, retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <html lang="id">
      <body>
        <ErrorState retry={retry} digest={error.digest} />
      </body>
    </html>
  )
}

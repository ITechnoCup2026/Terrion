'use client'

import { ErrorState } from '@/components/ui/ErrorState'

/**
 * The last resort: an error thrown by the root layout itself, where no other
 * boundary is mounted. It has to render its own html and body.
 */
export default function GlobalError({
  error, reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="id">
      <body>
        <ErrorState retry={reset} digest={error.digest} />
      </body>
    </html>
  )
}

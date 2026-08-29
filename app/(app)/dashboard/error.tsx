'use client'

import { ErrorState } from '@/components/ui/ErrorState'

export default function Error({
  error, retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return <ErrorState retry={retry} digest={error.digest} />
}

'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * The "go back" pill on the login and signup pages.
 *
 * Does not link to /dashboard: the (app) layout redirects anyone without a
 * session straight back to /login, so a signed-out visitor clicking a literal
 * dashboard link would bounce right back to the page they were trying to
 * leave. Browser history is what they actually mean by "back" -- it lands a
 * signed-in visitor back on the dashboard they came from, and sends anyone
 * else to the one page that never requires a session.
 */
export function AuthBackButton() {
  const router = useRouter()

  function goBack() {
    if (window.history.length > 1) router.back()
    else router.push('/')
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="interactive absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-ring/40 hover:text-foreground sm:left-6 sm:top-6"
    >
      <ArrowLeft aria-hidden className="size-3.5" />
      Kembali
    </button>
  )
}

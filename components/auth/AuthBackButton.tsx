import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * The "go back" pill link on the login and signup pages that returns to the landing page.
 */
export function AuthBackButton({ href = '/' }: { href?: string }) {
  return (
    <Link
      href={href}
      className="interactive absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-ring/40 hover:text-foreground sm:left-6 sm:top-6"
    >
      <ArrowLeft aria-hidden className="size-3.5" />
      Kembali ke beranda
    </Link>
  )
}


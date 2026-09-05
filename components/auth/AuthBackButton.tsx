import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

/**
 * The way back to the landing page, on the login and signup screens.
 *
 * It was a `.pill-quiet` -- the landing page's own button shape, shrunk. That
 * kept one shape vocabulary across the seam, but it also gave the smallest
 * thing on the screen a border, a shadow and a lift, which is the costume of
 * an action. Above a heading and a form with a single green submit, a second
 * bordered pill is the first thing the eye lands on and the last thing the
 * reader needs.
 *
 * So: a bare link. Arrow, label, muted ink, and the arrow steps left on hover
 * -- the direction it is pointing. No border means no competition, and the
 * page opens on its heading instead of on its escape hatch.
 *
 * In the flow above the heading, not pinned to the corner. Pinned, it sat on
 * top of whatever the column's own centring put underneath it -- on /signup,
 * where the form is five fields tall, that was the "02" chip. A link that
 * covers the heading of the page it is on is worse than one the reader has to
 * find a line lower.
 */
export function AuthBackButton({ href = '/' }: { href?: string }) {
  return (
    <Link
      href={href}
      className="interactive group mb-7 inline-flex items-center gap-1.5 self-start rounded-md text-xs font-semibold text-muted-foreground transition-colors hover:text-[var(--terrion-green-700)]"
    >
      <ArrowLeft
        aria-hidden
        className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
      />
      Kembali ke beranda
    </Link>
  )
}

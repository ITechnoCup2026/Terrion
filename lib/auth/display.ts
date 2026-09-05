import type { UserRole } from './roles'

/**
 * How a signed-in person is shown in a header.
 *
 * Lives here rather than in a component because two shells need the same
 * answers: the cooperative shell (app/(app)/layout.tsx) and the public header,
 * which now has a signed-in state of its own. The initials were computed
 * inline in the first of those, so the second would have grown a second copy
 * that drifted the first time somebody added a title to the strip list.
 */

/** Honorifics, not names. "Pak Budi Santoso" is BS, not PB. */
const HONORIFICS = /^(pak|bu|ibu|mas|mbak|haji|hj|pak haji)$/i

export function initialsOf(fullName: string): string {
  const initials = fullName
    .split(/\s+/)
    .filter(w => w && !HONORIFICS.test(w))
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  // A name that is nothing but an honorific, or empty, would otherwise render
  // an empty circle that reads as a failed avatar image.
  return initials || fullName.slice(0, 2).toUpperCase() || '?'
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case 'pengurus': return 'Pengurus koperasi'
    case 'kader': return 'Kader koperasi'
    case 'buyer': return 'Pembeli'
  }
}

/**
 * Where this role's own work lives. A buyer has no cooperative by
 * construction, so /dashboard would only ever answer 403 for them.
 *
 * It used to be /catalog, on the grounds that browsing is what a buyer signed
 * in for. That made the shop window their home: a buyer arriving after signing
 * in was shown forty cards of somebody else's harvest and nothing at all about
 * the requests they had already sent. /beranda is the page that answers "where
 * do I stand" first; the catalogue keeps its own job.
 */
export function homeFor(role: UserRole): string {
  return role === 'buyer' ? '/beranda' : '/dashboard'
}

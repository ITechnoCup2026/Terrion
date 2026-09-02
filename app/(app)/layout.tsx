import { redirect } from 'next/navigation'

import { AppShell } from '@/components/ui/AppShell'
import { BackendDownState } from '@/components/ui/BackendDownState'
import { isBackendDown } from '@/lib/api/client'
import { loadAtlasCooperativesIfUp } from '@/lib/atlas/load'
import { currentAppUser, type AppUser } from '@/lib/auth/session'

/**
 * The cooperative-side shell: who you are, which cooperative you are acting
 * for, and the four places you can go.
 *
 * The redirect here is a convenience, not a security boundary — RLS is what
 * actually keeps one cooperative out of another's rows, and every page keeps
 * its own role guard. This exists so a signed-out visitor gets the login page
 * instead of an empty frame around an empty list.
 *
 * The frame itself is <AppShell>, a Client Component, because its shape
 * depends on the route: the farm page takes the whole viewport and everything
 * else is a document. This file stays on the server so the auth check and the
 * cooperative lookup do, and so the sign-out form's Server Action never has to
 * cross into client code.
 *
 * Note what this no longer does: pad its children. A layout that pads cannot
 * have a child that fills the screen, and the plot page needed to. Each page
 * owns its own padding now.
 */
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  // Caught here rather than left to a boundary: an error.tsx catches a
  // layout's children, never the layout itself, so an outage would otherwise
  // land on the root global-error screen -- and, worse, the redirect below
  // would have sent the reader to /login to fix a session that is fine.
  let user: AppUser | null
  try {
    user = await currentAppUser()
  } catch (error) {
    if (!isBackendDown(error)) throw error
    return <BackendDownState />
  }

  if (!user) redirect('/login')

  // Buyers have no cooperative by construction (see the buyer_has_no_coop
  // check constraint), so this shell is not theirs.
  if (!user.cooperative_id) redirect('/catalog')

  // GET /api/me doesn't return the cooperative's name/village/district, and
  // there is no dedicated "my cooperative" endpoint -- but /api/atlas/cooperatives
  // is public and already carries them, so this looks itself up in that list
  // rather than inventing a new call.
  //
  // Tolerant of that call failing: the name under the logo is a label, and a
  // layout that throws takes down every page inside it -- an error.tsx catches
  // a layout's children, never the layout itself, so this one would land on
  // the root global-error screen over a subtitle.
  const cooperatives = await loadAtlasCooperativesIfUp()
  const match = cooperatives?.find(c => c.id === user.cooperative_id)
  const cooperative = match
    ? { name: match.name, village: match.village, district: match.district }
    : null

  // No sign-out form built here any more: <AccountMenu> inside the shell owns
  // it, and imports the Server Action itself. A client component may import a
  // Server Action directly -- it is passed as a reference, not executed -- so
  // routing it down through props bought nothing and cost this side its own
  // bespoke account control.
  return (
    <AppShell
      cooperative={cooperative ?? null}
      userName={user.full_name}
      role={user.role}
    >
      {children}
    </AppShell>
  )
}

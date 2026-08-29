import { redirect } from 'next/navigation'

import { signOut } from '@/app/actions/auth'
import { AppShell } from '@/components/ui/AppShell'
import { currentAppUser } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'

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
  const user = await currentAppUser()
  if (!user) redirect('/login')

  // Buyers have no cooperative by construction (see the buyer_has_no_coop
  // check constraint), so this shell is not theirs.
  if (!user.cooperative_id) redirect('/catalog')

  const db = await createServerClient()
  const { data: cooperative } = await db
    .from('cooperative')
    .select('name, village, district')
    .eq('id', user.cooperative_id)
    .maybeSingle()

  const initials = user.full_name
    .split(' ')
    .filter(w => !/^(pak|bu|ibu|mas|mbak)$/i.test(w))
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <AppShell
      cooperative={cooperative ?? null}
      userName={user.full_name}
      initials={initials}
      signOutButton={
        <form action={signOut}>
          <button
            type="submit"
            className="interactive rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-input hover:bg-muted hover:text-foreground"
          >
            Keluar
          </button>
        </form>
      }
    >
      {children}
    </AppShell>
  )
}

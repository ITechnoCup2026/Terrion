import { redirect } from 'next/navigation'

import { isBackendDown } from '@/lib/api/client'
import { homeFor } from '@/lib/auth/display'
import { currentAppUser, type AppUser } from '@/lib/auth/session'

/**
 * Keeps someone who is already signed in out of the login and signup forms.
 *
 * Without this a buyer who taps "Masuk" out of habit gets a password prompt for
 * the account they are already using, and the only way out is the browser's
 * back button. Sending them home instead states the truth: there is nothing to
 * sign into.
 *
 * A backend outage is not a signed-out visitor. If /api/me cannot be reached we
 * fall through and render the form -- unhelpful, but no worse than the outage
 * already is, and it leaves the door open the moment the backend answers again.
 * The layout catches this itself because an error.tsx catches a layout's
 * children, never the layout.
 *
 * This layout adds no markup: (auth) pages own their own full-screen frame.
 */
export default async function AuthLayout({ children }: LayoutProps<'/'>) {
  // Resolved before the redirect rather than inside the try: redirect() works
  // by throwing, and a catch that swallowed it would strand the reader here.
  let user: AppUser | null = null
  try {
    user = await currentAppUser()
  } catch (error) {
    if (!isBackendDown(error)) throw error
  }

  if (user) redirect(homeFor(user.role))

  return children
}

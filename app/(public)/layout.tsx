import { PublicFrame, type FrameUser } from '@/components/ui/PublicFrame'
import { isBackendDown } from '@/lib/api/client'
import { currentAppUser, type AppUser } from '@/lib/auth/session'

/**
 * The public shell: the landing page, the supply catalogue and a shared garden.
 *
 * It IS session-aware, and has to be. The header used to render "Masuk"
 * unconditionally on the grounds that there was no backend to ask — a comment
 * that outlived the backend arriving. The result was that a buyer, whose whole
 * job happens on the public catalogue, was invited to sign in on every page
 * after they already had, and had nowhere to sign out from at all.
 *
 * This file does the session lookup; <PublicFrame> picks the frame, because
 * that choice needs the pathname and a server layout cannot read one. A buyer
 * on their own screens gets the same rail a kader gets; everyone else gets the
 * marketing header.
 */
export default async function PublicLayout({ children }: LayoutProps<'/'>) {
  // These pages are public by design, so an unreachable backend must not take
  // them down — a stranger reading the catalogue is not affected by our being
  // unable to look up who they are. "I could not ask" therefore renders the
  // signed-out header here, which is the one place in the app where collapsing
  // it with "nobody is signed in" costs the reader nothing: every link in both
  // states goes somewhere that says so itself.
  let user: AppUser | null = null
  try {
    user = await currentAppUser()
  } catch (error) {
    if (!isBackendDown(error)) throw error
  }

  const frameUser: FrameUser | null = user
    ? { fullName: user.full_name, organisation: user.organisation, role: user.role }
    : null

  return <PublicFrame user={frameUser}>{children}</PublicFrame>
}

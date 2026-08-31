'use server'

import { redirect } from 'next/navigation'

/**
 * This repo has no backend attached, so there is no session to end. Kept as
 * a stub -- rather than removed -- so the sign-out buttons in the header and
 * app shell keep working: they just take you back to /login.
 */
export async function signOut() {
  redirect('/login')
}

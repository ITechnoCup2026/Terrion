'use server'

import { redirect } from 'next/navigation'

import { createServerClient } from '@/lib/supabase/server'

// Ends the session and returns to the login page. Switching between a
// cooperative account and a buyer account is a normal part of testing every
// flow, and without this there is no way out of a signed-in session.
export async function signOut() {
  const db = await createServerClient()
  await db.auth.signOut()
  redirect('/login')
}

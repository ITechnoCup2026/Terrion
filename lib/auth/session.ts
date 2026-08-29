import { createServerClient } from '@/lib/supabase/server'
import { assertRole, type AppUser, type UserRole } from './roles'

export type { AppUser, UserRole }

/**
 * The signed-in user's app_user row, or null if nobody is signed in.
 * Uses getUser, which verifies the token with Supabase — getSession would
 * trust a cookie the browser could have forged.
 */
export async function currentAppUser(): Promise<AppUser | null> {
  const db = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null

  const { data } = await db.from('app_user').select('*').eq('id', user.id).maybeSingle()
  return data ?? null
}

/** The signed-in user, but only if their role is allowed. Throws otherwise. */
export async function requireRole(roles: UserRole[]): Promise<AppUser> {
  return assertRole(await currentAppUser(), roles)
}

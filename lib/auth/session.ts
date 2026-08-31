import { apiFetch } from '@/lib/api/client'
import type { MeResponseRaw } from '@/lib/api/types'
import { createServerClient } from '@/lib/supabase/server'
import { assertRole, type AppUser, type UserRole } from './roles'

export type { AppUser, UserRole }

/**
 * The signed-in user's role and cooperative, read from Supabase's session
 * cookie and then verified against the backend's own app_user row via
 * GET /api/me. Supabase issues the token; this backend is the only thing
 * that knows whether an app_user row exists for it.
 *
 * Returns null for "no session" and for "session exists but /api/me
 * rejected it" alike -- an expired token and a visitor who never signed in
 * should look the same to every page gated on this.
 */
export async function currentAppUser(): Promise<AppUser | null> {
  const token = await currentAccessToken()
  if (!token) return null

  try {
    const me = await apiFetch<MeResponseRaw>('/api/me', { accessToken: token })
    return {
      id: me.id,
      cooperative_id: me.cooperative_id,
      full_name: me.full_name,
      organisation: me.organisation,
      role: me.role,
    }
  } catch {
    return null
  }
}

/** The Supabase access token for the current visitor, or null if signed out. */
export async function currentAccessToken(): Promise<string | null> {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function requireRole(roles: UserRole[]): Promise<AppUser> {
  return assertRole(await currentAppUser(), roles)
}

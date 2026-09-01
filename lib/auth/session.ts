import { cookies } from 'next/headers'

import { apiFetch, isBackendDown, SESSION_COOKIE } from '@/lib/api/client'
import type { MeResponseRaw } from '@/lib/api/types'
import { sessionCookieOptions } from './cookie'
import { assertRole, type AppUser, type UserRole } from './roles'

export type { AppUser, UserRole }
export { SESSION_MAX_AGE, sessionCookieOptions } from './cookie'

/** The backend session id for the current visitor, or null if signed out. */
export async function currentSessionId(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

/** Writes the session id issued by POST /api/auth/login. */
export async function setSessionCookie(sessionId: string): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, sessionId, sessionCookieOptions())
}

/** Drops the session cookie, after the backend has been told to end the session. */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/**
 * The signed-in user's role and cooperative, read from the terrion_session
 * cookie and then verified against the backend's own app_user row via
 * GET /api/me. The cookie names a session; only the backend knows whether an
 * app_user row still stands behind it.
 *
 * Returns null for "no session" and for "session exists but /api/me
 * rejected it" alike -- an expired session and a visitor who never signed in
 * should look the same to every page gated on this, which is the same thing
 * the backend does by answering 401 to both.
 *
 * A backend that cannot answer is NOT one of those, and is rethrown. Callers
 * turn null into a redirect to /login, and an outage sent through that path
 * tells a pengurus their session expired: they retype a password that was
 * never wrong, the login call fails for the same reason, and nothing on
 * screen ever mentions the server. "I could not ask" has to stay
 * distinguishable from "the answer is no".
 */
export async function currentAppUser(): Promise<AppUser | null> {
  const sessionId = await currentSessionId()
  if (!sessionId) return null

  try {
    const me = await apiFetch<MeResponseRaw>('/api/me', { sessionId })
    return {
      id: me.id,
      cooperative_id: me.cooperative_id,
      full_name: me.full_name,
      organisation: me.organisation,
      role: me.role,
    }
  } catch (error) {
    if (isBackendDown(error)) throw error
    return null
  }
}

export async function requireRole(roles: UserRole[]): Promise<AppUser> {
  return assertRole(await currentAppUser(), roles)
}

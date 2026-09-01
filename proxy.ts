import { NextResponse, type NextRequest } from 'next/server'

import { ApiError, apiFetch, SESSION_COOKIE } from '@/lib/api/client'
import { sessionCookieOptions } from '@/lib/auth/cookie'

/**
 * Keeps a live session alive across navigations by calling
 * POST /api/auth/refresh, which swaps the stored GoTrue refresh token for a
 * fresh pair without asking for the password again.
 *
 * The session id does not change when it refreshes -- the backend rewrites the
 * token pair under the same Redis key -- so there is no new cookie to hand
 * back. What is written here is only a marker recording when the last refresh
 * happened, because otherwise every navigation would spend a GoTrue round trip
 * to renew a token minted seconds ago.
 *
 * This is additive: route protection stays where it already lives, inside each
 * page's currentAppUser() guard (lib/auth/session.ts) -- this proxy changes
 * nothing about who can see what, only how long a session lasts.
 */

/** How long a refresh is trusted to hold before another is worth making. */
const REFRESH_EVERY_SECONDS = 30 * 60

const REFRESHED_COOKIE = 'terrion_session_refreshed'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })

  const sessionId = request.cookies.get(SESSION_COOKIE)?.value
  if (!sessionId) return response

  const refreshedAt = Number(request.cookies.get(REFRESHED_COOKIE)?.value ?? 0)
  const now = Math.floor(Date.now() / 1000)
  if (Number.isFinite(refreshedAt) && now - refreshedAt < REFRESH_EVERY_SECONDS) {
    return response
  }

  try {
    await apiFetch<void>('/api/auth/refresh', { method: 'POST', sessionId })
    response.cookies.set(REFRESHED_COOKIE, String(now), sessionCookieOptions())
  } catch (error) {
    // 401 means the id is gone from Redis: the cookie now names nothing, and
    // keeping it only makes every page re-discover that on its own. Anything
    // else -- GoTrue refusing the refresh token, the backend being down -- is
    // not this session's fault, so it is left standing.
    if (error instanceof ApiError && error.status === 401) {
      response.cookies.delete(SESSION_COOKIE)
      response.cookies.delete(REFRESHED_COOKIE)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|geo/).*)'],
}

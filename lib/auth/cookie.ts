/**
 * How this app mirrors the backend's session cookie on its own origin.
 *
 * Kept apart from session.ts because proxy.ts needs these too, and middleware
 * cannot import next/headers -- putting the shape next to the cookie *store*
 * would drag `cookies()` into the edge bundle.
 */

/** 30 days, matching the session's own lifetime in the backend's Redis. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30

/**
 * `httpOnly` because nothing in the browser has any use for the session id --
 * every call that carries it is made server-side. `sameSite: 'lax'` because
 * the cookie only ever travels to this app's own routes; the cross-site
 * `SameSite=None` the backend sets is a property of the backend's domain, not
 * of this one.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  }
}

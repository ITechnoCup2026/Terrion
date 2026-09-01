'use server'

import { redirect } from 'next/navigation'

import { apiFetch } from '@/lib/api/client'
import { clearSessionCookie, currentSessionId } from '@/lib/auth/session'

/**
 * Ends the session at POST /api/auth/logout -- which revokes it in GoTrue and
 * drops it from Redis -- then clears this app's mirror of the cookie.
 *
 * The backend answers 204 even for a cookie it has never heard of, and a
 * failure to reach it at all must not strand the reader in a signed-in shell
 * they cannot leave: the local cookie goes either way, because from the
 * browser's side the session ends the moment it does.
 *
 * `next` is where the reader lands afterwards. It defaults to /login because
 * that is the only page left to a kader or pengurus once the shell is gone,
 * but the public header passes / instead: a buyer signing out of the catalogue
 * can still read the catalogue, and answering their sign-out with a sign-in
 * form is the same confusion this header already had.
 *
 * Bind it when wiring this to a form -- `signOut.bind(null, '/')` -- because a
 * bare `<form action={signOut}>` calls it with the FormData in the first slot.
 * Hence `unknown` and the guard below: that mistake should sign the reader out,
 * not throw on `next.startsWith`.
 */
export async function signOut(next: unknown = '/login') {
  const sessionId = await currentSessionId()

  if (sessionId) {
    try {
      await apiFetch<void>('/api/auth/logout', { method: 'POST', sessionId })
    } catch (error) {
      console.error('[auth] logout call failed', error)
    }
  }

  await clearSessionCookie()

  // Same-origin, absolute path only. The argument reaches here from a form in
  // the browser, and a redirect target taken on trust is an open redirect --
  // `//evil.example` is a protocol-relative URL, not a path.
  const safe =
    typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')
      ? next
      : '/login'
  redirect(safe)
}

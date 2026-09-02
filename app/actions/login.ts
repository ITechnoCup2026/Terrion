'use server'

import { apiExchange, apiFetch, ApiError, isBackendDown, sessionIdFromResponse } from '@/lib/api/client'
import type { LoginResponseRaw } from '@/lib/api/types'
import { loginRoleRefusal } from '@/lib/auth/login-role'
import { setSessionCookie } from '@/lib/auth/session'
import { signupErrorMessage } from '@/lib/auth/signup-errors'
import { loginSchema, type LoginInput } from '@/lib/schemas/login'

export type { LoginInput }

export type LoginResult =
  | { ok: true; role: LoginResponseRaw['role'] }
  | { ok: false; message: string }

/**
 * Ends a session that was created and then refused, so a sign-in this app
 * turned down does not leave a working session id sitting in the backend's
 * Redis for the next thirty days. Best effort: the cookie is never written on
 * that path either way, so a failed revoke leaves an id nothing on this side
 * can present.
 */
async function revoke(sessionId: string): Promise<void> {
  try {
    await apiFetch<void>('/api/auth/logout', { method: 'POST', sessionId })
  } catch (error) {
    console.error('[auth] could not revoke a refused sign-in', error)
  }
}

/**
 * Exchanges email and password for a session at POST /api/auth/login.
 *
 * The backend holds the GoTrue token pair in Redis and answers with a session
 * id in a `terrion_session` cookie scoped to its own domain -- which in
 * production is not this one -- so the id is lifted out of the response and
 * re-issued here under this app's origin.
 *
 * The response body is a `UserResponse`, the same shape GET /api/me returns,
 * so there is nothing to look up afterwards: the role travels back with the
 * sign-in itself.
 *
 * That role is then checked against the tab the reader picked, and a mismatch
 * ends the sign-in before any cookie is written. Note the order: the tab is
 * never sent to the backend and never selects an account, so it can only
 * refuse a role the backend already confirmed -- it narrows a sign-in, it
 * cannot widen one. The check belongs here rather than in the form because
 * the form is a client component: a request posted straight at this action
 * has to meet the same rule.
 *
 * It is a refusal, not a redirect. A pembeli who typed their password under
 * the koperasi tab used to be signed in and then bounced to /catalog by the
 * layout's guard, which reads as the app losing the page they asked for
 * rather than as their account not belonging there. The page guards in
 * app/(app) and the backend's own RLS remain the boundary; this stops the
 * wrong door opening quietly in the first place.
 */
export async function signIn(raw: LoginInput): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Isian tidak valid.' }
  }

  const { as, ...credentials } = parsed.data

  try {
    const { data, response } = await apiExchange<LoginResponseRaw>('/api/auth/login', {
      method: 'POST',
      body: credentials,
    })

    const sessionId = sessionIdFromResponse(response)
    if (!sessionId) {
      // Credentials were accepted but no cookie came back, so nothing here can
      // prove who the next request is. Saying "signed in" would hand the reader
      // a dashboard that immediately bounces them to /login.
      return { ok: false, message: 'Sesi tidak bisa dibuat. Coba lagi sebentar lagi.' }
    }

    const refusal = loginRoleRefusal(data.role, as)
    if (refusal) {
      await revoke(sessionId)
      return { ok: false, message: refusal }
    }

    await setSessionCookie(sessionId)
    return { ok: true, role: data.role }
  } catch (error) {
    // An unreachable backend is not a wrong password, and must not be
    // described as one: the reader would keep retyping a password that was
    // right the first time.
    if (isBackendDown(error)) {
      return { ok: false, message: 'Server sedang tidak bisa dihubungi. Coba lagi beberapa saat lagi.' }
    }
    if (error instanceof ApiError) {
      return { ok: false, message: signupErrorMessage({ code: error.code }) }
    }
    return { ok: false, message: 'Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.' }
  }
}

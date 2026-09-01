'use server'

import { apiExchange, ApiError, isBackendDown, sessionIdFromResponse } from '@/lib/api/client'
import type { LoginResponseRaw } from '@/lib/api/types'
import { setSessionCookie } from '@/lib/auth/session'
import { signupErrorMessage } from '@/lib/auth/signup-errors'
import { loginSchema, type LoginInput } from '@/lib/schemas/login'

export type { LoginInput }

export type LoginResult =
  | { ok: true; role: LoginResponseRaw['role'] }
  | { ok: false; message: string }

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
 */
export async function signIn(raw: LoginInput): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Isian tidak valid.' }
  }

  try {
    const { data, response } = await apiExchange<LoginResponseRaw>('/api/auth/login', {
      method: 'POST',
      body: parsed.data,
    })

    const sessionId = sessionIdFromResponse(response)
    if (!sessionId) {
      // Credentials were accepted but no cookie came back, so nothing here can
      // prove who the next request is. Saying "signed in" would hand the reader
      // a dashboard that immediately bounces them to /login.
      return { ok: false, message: 'Sesi tidak bisa dibuat. Coba lagi sebentar lagi.' }
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

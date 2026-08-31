'use server'

import { apiFetch, ApiError } from '@/lib/api/client'
import type { SignupResponseRaw } from '@/lib/api/types'
import { signupErrorMessage } from '@/lib/auth/signup-errors'
import { signupSchema } from '@/lib/schemas/signup'
import { createServerClient } from '@/lib/supabase/server'

export type SignupResult =
  | { outcome: 'signed_in' }
  | { outcome: 'confirm_email'; email: string }
  | { outcome: 'error'; message: string }

/**
 * Registers a buyer against the real backend (POST /api/auth/signup, which
 * always creates a `buyer` -- role and cooperative are not in the request
 * body at all, see the schema comment). Its `signed_in` outcome means the
 * project doesn't require email confirmation, but the response carries no
 * token, so this immediately follows up with its own sign-in call to
 * actually establish the browser's session.
 */
export async function signUpBuyer(raw: unknown): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) {
    return { outcome: 'error', message: parsed.error.issues[0]?.message ?? 'Isian tidak valid.' }
  }
  const { fullName, organisation, email, password, confirmPassword } = parsed.data

  try {
    const result = await apiFetch<SignupResponseRaw>('/api/auth/signup', {
      method: 'POST',
      body: {
        full_name: fullName,
        organisation,
        email,
        password,
        confirm_password: confirmPassword,
      },
    })

    if (result.outcome === 'signed_in') {
      const supabase = await createServerClient()
      await supabase.auth.signInWithPassword({ email, password })
      return { outcome: 'signed_in' }
    }

    return { outcome: 'confirm_email', email: result.email }
  } catch (error) {
    if (error instanceof ApiError) {
      return { outcome: 'error', message: signupErrorMessage({ code: error.code }) }
    }
    return { outcome: 'error', message: 'Gagal mendaftar. Coba lagi sebentar lagi.' }
  }
}

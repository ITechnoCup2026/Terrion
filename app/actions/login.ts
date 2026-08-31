'use server'

import { signupErrorMessage } from '@/lib/auth/signup-errors'
import { createServerClient } from '@/lib/supabase/server'

export type LoginInput = { email: string; password: string }

export type LoginResult =
  | { ok: true }
  | { ok: false; message: string }

/**
 * Signs in against Supabase directly -- the backend contract has no login
 * endpoint of its own; Supabase issues the token and this backend only
 * verifies it. Errors are mapped through the same
 * Indonesian messages the signup form uses, since Supabase returns the same
 * kind of auth error codes for both.
 */
export async function signIn(raw: LoginInput): Promise<LoginResult> {
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword(raw)
  if (error) {
    return { ok: false, message: signupErrorMessage(error) }
  }
  return { ok: true }
}

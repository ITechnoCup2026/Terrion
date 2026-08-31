'use server'

import { signupSchema } from '@/lib/schemas/signup'

export type SignupResult =
  | { outcome: 'signed_in' }
  | { outcome: 'confirm_email'; email: string }
  | { outcome: 'error'; message: string }

/**
 * This repo has no backend attached. Kept as a stub, with the same signature
 * as the real action, so SignupForm keeps working as UI: it still validates
 * with the same schema the form uses, but can never actually register anyone.
 */
export async function signUpBuyer(raw: unknown): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) {
    return { outcome: 'error', message: parsed.error.issues[0]?.message ?? 'Isian tidak valid.' }
  }
  return { outcome: 'error', message: 'Belum ada backend yang terhubung untuk mendaftarkan akun.' }
}

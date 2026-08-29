import { z } from 'zod'

/**
 * What a buyer may say about themselves when registering.
 *
 * Shared by SignupForm and the signup Server Action so both agree on what a
 * valid registration is. Form fields arrive as strings, hence the trimming.
 *
 * Note what is absent: `role` and `cooperativeId`. A self-service form must not
 * be able to choose what kind of account it creates, and Zod strips unknown
 * keys by default, so a crafted POST carrying role: 'pengurus' loses it here
 * rather than being caught by a check somebody has to remember to write. The
 * action hard-codes 'buyer'.
 *
 * `organisation` is required, though the column is nullable and `pnpm register`
 * treats it as optional. It is the one thing the cooperative sees when deciding
 * whether to accept a request, so a self-registered buyer has to supply it.
 */
export const signupSchema = z.object({
  fullName:     z.string().trim().min(2, 'Nama lengkap minimal 2 karakter'),
  organisation: z.string().trim().min(2, 'Nama organisasi minimal 2 karakter'),
  email:        z.email('Email tidak valid').trim().toLowerCase(),
  password:     z.string().min(8, 'Kata sandi minimal 8 karakter'),
  confirmPassword: z.string(),
}).refine(v => v.password === v.confirmPassword, {
  message: 'Konfirmasi kata sandi tidak cocok',
  path: ['confirmPassword'],
})

export type SignupInput = z.infer<typeof signupSchema>

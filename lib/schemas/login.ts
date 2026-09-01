import { z } from 'zod'

/**
 * What the sign-in form may say. Mirrors the backend's own validation on
 * POST /api/auth/login (email format, password at least 8 characters) so a
 * typo is refused in Indonesian here rather than coming back as the bare code
 * `validation_failed`.
 *
 * Note what is absent: the "masuk sebagai" tab. Role comes back from the
 * login response, which is a `UserResponse` -- the tabs on the page are a
 * label for the reader, never an input to the exchange.
 */
export const loginSchema = z.object({
  email:    z.email('Email tidak valid').trim().toLowerCase(),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
})

export type LoginInput = z.infer<typeof loginSchema>

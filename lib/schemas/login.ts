import { z } from 'zod'

import type { UserRole } from '@/lib/auth/roles'

export const loginSchema = z.object({
  email:    z.email('Email tidak valid').trim().toLowerCase(),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
  as:       z.enum(['kader', 'pengurus', 'buyer'] as const satisfies readonly UserRole[]).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>

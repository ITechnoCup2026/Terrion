import type { Database } from '@/lib/supabase/types.gen'

export type AppUser = Database['public']['Tables']['app_user']['Row']
export type UserRole = AppUser['role']

/**
 * Lets a user through only if their role is on the list, otherwise throws.
 * Not being signed in and not being allowed give the same answer, so a caller
 * cannot mistake a visitor for a permitted user.
 */
export function assertRole(user: AppUser | null, roles: UserRole[]): AppUser {
  if (!user || !roles.includes(user.role)) throw new Error('UNAUTHORISED')
  return user
}

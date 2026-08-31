import { assertRole, type AppUser, type UserRole } from './roles'

export type { AppUser, UserRole }

/**
 * This repo has no backend attached -- the Supabase project it used to read
 * from was removed. There is no session to read, so every caller sees nobody
 * signed in, and every page gated on this redirects to /login exactly as it
 * would for a real signed-out visitor.
 */
export async function currentAppUser(): Promise<AppUser | null> {
  return null
}

/** Always throws until a backend is wired back up: nobody is ever signed in. */
export async function requireRole(roles: UserRole[]): Promise<AppUser> {
  return assertRole(await currentAppUser(), roles)
}

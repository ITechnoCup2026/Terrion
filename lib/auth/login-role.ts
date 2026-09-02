import { roleLabel } from './display'
import type { UserRole } from './roles'

export const ROLE_TAB_LABEL: Record<UserRole, string> = {
  kader: 'Kader',
  pengurus: 'Pengurus',
  buyer: 'Pembeli',
}


export function loginRoleRefusal(actual: UserRole, picked?: UserRole): string | null {
  if (!picked || actual === picked) return null
  return (
    `Akun ini terdaftar sebagai ${roleLabel(actual)}.`
  )
}

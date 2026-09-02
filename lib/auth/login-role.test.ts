import { describe, expect, it } from 'vitest'

import { loginRoleRefusal } from './login-role'
import type { UserRole } from './roles'

const ROLES: UserRole[] = ['kader', 'pengurus', 'buyer']

describe('loginRoleRefusal', () => {
  it('lets a role through its own tab', () => {
    for (const role of ROLES) expect(loginRoleRefusal(role, role)).toBeNull()
  })

  it('refuses every tab that is not the account\'s own', () => {
    for (const actual of ROLES) {
      for (const picked of ROLES) {
        if (actual === picked) continue
        expect(loginRoleRefusal(actual, picked)).toBeTruthy()
      }
    }
  })

  it('keeps a buyer off the cooperative tabs -- the bug this exists for', () => {
    expect(loginRoleRefusal('buyer', 'kader')).toContain('Pembeli')
    expect(loginRoleRefusal('buyer', 'pengurus')).toContain('Pembeli')
  })

  it('does not treat pengurus and kader as one cooperative audience', () => {
    expect(loginRoleRefusal('kader', 'pengurus')).toContain('Kader')
    expect(loginRoleRefusal('pengurus', 'kader')).toContain('Pengurus')
  })

  it('returns null when no picked tab is provided', () => {
    for (const role of ROLES) expect(loginRoleRefusal(role)).toBeNull()
  })

  it('names the account role', () => {
    expect(loginRoleRefusal('pengurus', 'buyer')).toBe(
      'Akun ini terdaftar sebagai Pengurus koperasi.',
    )
  })
})

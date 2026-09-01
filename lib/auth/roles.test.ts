import { describe, it, expect } from 'vitest'
import { assertRole, type AppUser } from './roles'

const user = (role: AppUser['role']): AppUser => ({
  id: '11111111-1111-4111-8111-111111111111',
  cooperative_id: '22222222-2222-4222-8222-222222222222',
  full_name: 'Bu Sri',
  organisation: null,
  role,
})

describe('assertRole', () => {
  it('returns the user when their role is allowed', () => {
    const kader = user('kader')
    expect(assertRole(kader, ['kader'])).toBe(kader)
  })

  it('accepts any one of several allowed roles', () => {
    expect(assertRole(user('pengurus'), ['kader', 'pengurus']).role).toBe('pengurus')
  })

  it('rejects a signed-in user whose role is not allowed', () => {
    expect(() => assertRole(user('buyer'), ['kader', 'pengurus'])).toThrow('UNAUTHORISED')
  })

  it('rejects a visitor who is not signed in', () => {
    expect(() => assertRole(null, ['kader'])).toThrow('UNAUTHORISED')
  })

  // An empty allow-list must deny everyone, never wave everyone through.
  it('rejects everyone when no role is allowed', () => {
    expect(() => assertRole(user('kader'), [])).toThrow('UNAUTHORISED')
  })
})

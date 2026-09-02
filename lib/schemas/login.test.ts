import { describe, expect, it } from 'vitest'

import { loginSchema } from './login'

const valid = { email: 'kader@koperasi.test', password: 'rahasia123' }

describe('loginSchema', () => {
  it('accepts a valid login input with email and password', () => {
    expect(loginSchema.parse(valid)).toEqual(valid)
  })

  it('lower-cases the email, so one address cannot become two accounts', () => {
    expect(loginSchema.parse({ ...valid, email: 'Kader@Koperasi.test' }).email).toBe(
      'kader@koperasi.test',
    )
  })

  it('accepts optional role if provided', () => {
    expect(loginSchema.parse({ ...valid, as: 'kader' })).toEqual({ ...valid, as: 'kader' })
  })

  it('refuses invalid role option', () => {
    expect(loginSchema.safeParse({ ...valid, as: 'koperasi' }).success).toBe(false)
  })
})


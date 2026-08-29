import { describe, expect, it } from 'vitest'

import { signupErrorMessage } from './signup-errors'

describe('signupErrorMessage', () => {
  it('explains a rejected address domain rather than repeating "invalid"', () => {
    const message = signupErrorMessage({
      code: 'email_address_invalid',
      message: 'Email address "diana@pangannusantara.test" is invalid',
    })
    // The reader typed an address they believe is fine. Echoing Supabase's
    // "is invalid" back at them is the answer that made this a bug report.
    expect(message).toContain('.test')
    expect(message).not.toContain('is invalid')
    expect(message).not.toContain('diana@')
  })

  it('names the confirmation mail as the thing that is throttled', () => {
    const message = signupErrorMessage({
      code: 'over_email_send_rate_limit',
      message: 'email rate limit exceeded',
    })
    expect(message).toMatch(/tunggu|coba lagi/i)
  })

  it('handles the request rate limit separately from the email one', () => {
    expect(signupErrorMessage({ code: 'over_request_rate_limit', message: '' }))
      .toMatch(/terlalu banyak/i)
  })

  it('reports a weak password as a password problem', () => {
    expect(signupErrorMessage({ code: 'weak_password', message: '' }))
      .toMatch(/kata sandi/i)
  })

  it('says so when signup is switched off at the project', () => {
    expect(signupErrorMessage({ code: 'signup_disabled', message: '' }))
      .toMatch(/tidak menerima|ditutup/i)
  })

  it('falls back to a plain Indonesian sentence for an unmapped code', () => {
    const message = signupErrorMessage({ code: 'some_new_code', message: 'whatever' })
    expect(message).toMatch(/gagal mendaftar/i)
    // Never the raw Supabase string: it is English, and it leaks internals.
    expect(message).not.toContain('whatever')
  })

  it('survives an error with no code at all', () => {
    expect(signupErrorMessage({ message: 'boom' })).toMatch(/gagal mendaftar/i)
    expect(signupErrorMessage({})).toMatch(/gagal mendaftar/i)
  })

  it('is always Indonesian, for every code it knows', () => {
    const codes = [
      'email_address_invalid', 'over_email_send_rate_limit', 'over_request_rate_limit',
      'weak_password', 'signup_disabled', 'email_provider_disabled', 'validation_failed',
    ]
    for (const code of codes) {
      const message = signupErrorMessage({ code, message: '' })
      expect(message.length).toBeGreaterThan(10)
      // No raw Supabase text leaked through. Matching whole phrases, not bare
      // words: the address message legitimately names TLDs like .invalid, and
      // a word-level check would forbid the clearest wording available.
      expect(message).not.toMatch(/is invalid|rate limit exceeded|signups not allowed/i)
      // Ends in a full stop -- these are sentences shown to a stranger.
      expect(message.trim()).toMatch(/\.$/)
    }
  })
})

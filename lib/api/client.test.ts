import { describe, expect, it } from 'vitest'

import { ApiError, isBackendDown, isNotFound, NETWORK_ERROR, sessionIdFromResponse } from './client'

/**
 * The login exchange hinges on lifting one cookie out of a response whose
 * domain is not this app's. Everything else about apiFetch is a fetch call;
 * this is the part with a decision in it.
 */
describe('sessionIdFromResponse', () => {
  const withCookies = (...cookies: string[]) => {
    const headers = new Headers()
    for (const cookie of cookies) headers.append('set-cookie', cookie)
    return new Response(null, { status: 200, headers })
  }

  it('reads the session id out of the backend cookie', () => {
    const response = withCookies(
      'terrion_session=abc123; Path=/; HttpOnly; Max-Age=2592000; SameSite=None; Secure',
    )
    expect(sessionIdFromResponse(response)).toBe('abc123')
  })

  it('ignores other cookies on the same response', () => {
    const response = withCookies('other=nope; Path=/', 'terrion_session=abc123; Path=/')
    expect(sessionIdFromResponse(response)).toBe('abc123')
  })

  it('is null when no session cookie came back', () => {
    expect(sessionIdFromResponse(withCookies('other=nope; Path=/'))).toBeNull()
    expect(sessionIdFromResponse(new Response(null))).toBeNull()
  })

  // A cleared cookie -- what logout sends -- names the session with no value.
  // Treating that as an id would hand the next request an empty Cookie header
  // and read it back as a signed-in visitor.
  it('is null for a cookie that was cleared rather than set', () => {
    expect(sessionIdFromResponse(withCookies('terrion_session=; Path=/; Max-Age=0'))).toBeNull()
  })
})

/**
 * The distinction these two draw is the whole reason they exist: a 404 is the
 * contract saying "not there, or not yours", and everything else is the
 * backend failing to answer. Collapsing them is how a visitor gets told their
 * garden does not exist because a gateway was down.
 */
describe('classifying a failure', () => {
  const err = (status: number, code = 'x') => new ApiError(status, code)

  it('treats only 404 as not-found', () => {
    expect(isNotFound(err(404, 'plot not found'))).toBe(true)
    expect(isNotFound(err(500, 'internal'))).toBe(false)
    expect(isNotFound(err(502, 'http_502'))).toBe(false)
    expect(isNotFound(err(401, 'Unauthorised'))).toBe(false)
    expect(isNotFound(new Error('something else'))).toBe(false)
  })

  it('counts an unreachable host and a gateway error as the backend being down', () => {
    expect(isBackendDown(new ApiError(NETWORK_ERROR, 'network_unreachable'))).toBe(true)
    expect(isBackendDown(err(502, 'http_502'))).toBe(true)
    expect(isBackendDown(err(503, 'http_503'))).toBe(true)
    expect(isBackendDown(err(500, 'internal'))).toBe(true)
  })

  // A refusal the backend actually authored is not an outage, and a page that
  // degrades on one of these would be hiding an answer it was given.
  it('does not count a refusal as the backend being down', () => {
    expect(isBackendDown(err(401, 'Unauthorised'))).toBe(false)
    expect(isBackendDown(err(403, 'forbidden'))).toBe(false)
    expect(isBackendDown(err(404, 'plot not found'))).toBe(false)
    expect(isBackendDown(err(422, 'stagger_nothing_to_shift'))).toBe(false)
    expect(isBackendDown(new Error('something else'))).toBe(false)
  })
})

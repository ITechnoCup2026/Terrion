import { describe, expect, it, vi } from 'vitest'

import { attempt, ExpectedFailure, isFailure } from './result'

describe('attempt', () => {
  it('wraps a value that came back', async () => {
    const result = await attempt(async () => ({ shifted: 3 }))
    expect(result).toEqual({ ok: true, data: { shifted: 3 } })
  })

  it('turns an ExpectedFailure into its message, verbatim', async () => {
    const result = await attempt(async () => {
      throw new ExpectedFailure('Saran penggeseran ini sudah tidak berlaku. Muat ulang dasbor.')
    })
    expect(result).toEqual({
      ok: false,
      message: 'Saran penggeseran ini sudah tidak berlaku. Muat ulang dasbor.',
    })
  })

  it('does NOT leak the message of an ordinary Error', async () => {
    // The whole point. An ordinary throw is a bug, and its message names
    // internals -- table names, constraint names, connection strings.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await attempt(async () => {
      throw new Error('duplicate key value violates unique constraint "plot_public_id_key"')
    })
    expect(result.ok).toBe(false)
    expect(isFailure(result) && result.message).not.toContain('plot_public_id_key')
    expect(isFailure(result) && result.message).toMatch(/terjadi kesalahan/i)
    consoleError.mockRestore()
  })

  it('logs the unexpected error rather than swallowing it', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    await attempt(async () => { throw new Error('boom') })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('does not log an ExpectedFailure — it is not a fault', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    await attempt(async () => { throw new ExpectedFailure('Sudah tidak tersedia.') })
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('handles a thrown non-Error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await attempt(async () => { throw 'a string' })
    expect(result.ok).toBe(false)
    consoleError.mockRestore()
  })

  it('never resolves to a rejected promise, whatever is thrown', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    // A Server Action that rejects is exactly what produces React #441, so
    // attempt() rejecting would defeat its own purpose.
    for (const thrown of [new Error('x'), new ExpectedFailure('y'), 'z', null, undefined, 42]) {
      await expect(attempt(async () => { throw thrown })).resolves.toBeDefined()
    }
    consoleError.mockRestore()
  })
})

describe('isFailure', () => {
  it('narrows both ways', () => {
    expect(isFailure({ ok: false, message: 'x' })).toBe(true)
    expect(isFailure({ ok: true, data: 1 })).toBe(false)
  })
})

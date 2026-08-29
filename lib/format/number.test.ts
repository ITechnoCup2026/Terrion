import { describe, expect, it } from 'vitest'

import { formatNumberId } from './number'

describe('formatNumberId', () => {
  it('uses a comma for the decimal separator', () => {
    expect(formatNumberId(3.14159, 1)).toBe('3,1')
  })

  it('uses a dot for the thousands separator', () => {
    expect(formatNumberId(1234567, 0)).toBe('1.234.567')
  })

  it('combines both separators', () => {
    expect(formatNumberId(4200.5, 1)).toBe('4.200,5')
  })

  it('drops a trailing zero decimal rather than showing 112,0', () => {
    expect(formatNumberId(112, 1)).toBe('112')
  })

  it('renders zero as 0 — null-not-zero is the caller’s job, not the formatter’s', () => {
    expect(formatNumberId(0, 1)).toBe('0')
  })

  it('rounds to the requested precision', () => {
    expect(formatNumberId(4.26, 1)).toBe('4,3')
    expect(formatNumberId(4.24, 1)).toBe('4,2')
  })

  it('keeps the sign on negatives', () => {
    expect(formatNumberId(-1234.5, 1)).toBe('-1.234,5')
  })

  it('defaults to one decimal', () => {
    expect(formatNumberId(4.26)).toBe('4,3')
  })

  it('supports more than one decimal', () => {
    expect(formatNumberId(0.0393, 4)).toBe('0,0393')
  })

  // A NaN reaching a dashboard tile is a bug upstream, but printing "NaN" to a
  // farmer is worse than printing a dash.
  it('degrades a non-finite value to a dash instead of NaN', () => {
    expect(formatNumberId(Number.NaN)).toBe('—')
    expect(formatNumberId(Number.POSITIVE_INFINITY)).toBe('—')
  })
})

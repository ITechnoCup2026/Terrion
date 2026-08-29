import { describe, expect, it } from 'vitest'

import { formatRupiah, formatRupiahSigned } from './rupiah'

describe('formatRupiah', () => {
  it('writes small amounts in full', () => {
    expect(formatRupiah(150)).toBe('Rp 150')
  })

  it('groups thousands the Indonesian way', () => {
    expect(formatRupiah(12500)).toBe('Rp 12.500')
  })

  it('rounds away the rupiah fraction — nobody quotes cents', () => {
    expect(formatRupiah(12500.4)).toBe('Rp 12.500')
    expect(formatRupiah(12500.6)).toBe('Rp 12.501')
  })

  // A stat tile is ~150 px wide at 360 px; "Rp 4.250.000" does not fit.
  it('compacts millions to juta', () => {
    expect(formatRupiah(4_250_000)).toBe('Rp 4,3 jt')
  })

  it('compacts billions to miliar', () => {
    expect(formatRupiah(1_240_000_000)).toBe('Rp 1,2 M')
  })

  it('switches to juta exactly at one million', () => {
    expect(formatRupiah(999_999)).toBe('Rp 999.999')
    expect(formatRupiah(1_000_000)).toBe('Rp 1 jt')
  })

  it('keeps the minus outside the currency mark', () => {
    expect(formatRupiah(-150)).toBe('-Rp 150')
    expect(formatRupiah(-4_250_000)).toBe('-Rp 4,3 jt')
  })

  it('renders zero without compacting', () => {
    expect(formatRupiah(0)).toBe('Rp 0')
  })

  it('degrades a non-finite value to a dash', () => {
    expect(formatRupiah(Number.NaN)).toBe('—')
  })
})

describe('formatRupiahSigned', () => {
  // "Rp 150" above a reference price is ambiguous; "+Rp 150" is not.
  it('marks a positive amount explicitly', () => {
    expect(formatRupiahSigned(150)).toBe('+Rp 150')
  })

  it('marks a negative amount', () => {
    expect(formatRupiahSigned(-150)).toBe('-Rp 150')
  })

  it('leaves zero unsigned', () => {
    expect(formatRupiahSigned(0)).toBe('Rp 0')
  })
})

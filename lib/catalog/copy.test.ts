import { describe, expect, it } from 'vitest'

import * as copy from './copy'

// Every string this module can produce, including the ones behind functions.
// A term is only truly banned if the functions cannot emit it either.
function everyString(): string[] {
  const out: string[] = []
  for (const [name, value] of Object.entries(copy)) {
    // The banned list is itself made of banned words. Collecting it would make
    // this test fail against its own vocabulary.
    if (name === 'FORBIDDEN_TERMS') continue
    if (typeof value === 'string') out.push(value)
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') out.push(item)
        else if (item && typeof item === 'object') {
          out.push(...Object.values(item).filter(v => typeof v === 'string') as string[])
        }
      }
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...Object.values(value).filter(v => typeof v === 'string') as string[])
    }
  }
  out.push(copy.deliveryPreferenceNote('antar_ke_gudang'))
  out.push(copy.deliveryPreferenceNote('ambil_di_koperasi'))
  out.push(copy.deliveryPreferenceNote('belum_ditentukan'))
  out.push(copy.overVolumeWarning(50, 36.7))
  out.push(copy.listingSummary({ tonnes: 36.7, cooperativeName: 'Koperasi Tani Subang Jaya' }))
  out.push(copy.requestBuyerLabel('Ibu Diana Prasetyo', 'PT Pangan Nusantara'))
  out.push(copy.requestBuyerLabel('Ibu Diana Prasetyo', null))
  for (const s of ['pending', 'accepted', 'declined', 'withdrawn'] as const) {
    out.push(copy.requestStatusLabel(s))
  }
  return out
}

describe('commerce copy', () => {
  // Terrion is not a party to the contract and must never present itself as
  // one. This is why the copy lives in lib/ instead of inline in JSX: it makes
  // the rule testable rather than something review has to catch.
  it('never uses futures or advance-payment framing', () => {
    for (const text of everyString()) {
      for (const term of copy.FORBIDDEN_TERMS) {
        expect(text.toLowerCase()).not.toContain(term)
      }
    }
  })

  it('states the legal framing verbatim', () => {
    expect(copy.LEGAL_FRAMING).toBe(
      'Permintaan ini dikirim ke koperasi, yang akan menerima atau menolak. ' +
      'Terrion adalah penyedia sistem, bukan pihak dalam kontrak, dan tidak menjamin pengiriman.',
    )
  })

  // Over-asking is allowed, so the warning has to be informative rather than
  // scolding, and it must name both numbers.
  it('warns with both numbers when the request exceeds the projection', () => {
    const warning = copy.overVolumeWarning(50, 36.7)
    expect(warning).toContain('50')
    expect(warning).toContain('36,7')
    expect(warning.toLowerCase()).toContain('sebagian')
  })

  it('turns a delivery preference into a readable note', () => {
    expect(copy.deliveryPreferenceNote('ambil_di_koperasi'))
      .toBe('Preferensi pengiriman: Ambil sendiri di koperasi.')
  })

  it('offers exactly the three delivery preferences', () => {
    expect(copy.DELIVERY_PREFERENCES.map(p => p.value))
      .toEqual(['antar_ke_gudang', 'ambil_di_koperasi', 'belum_ditentukan'])
  })

  // The pengurus is being asked to commit the cooperative to supplying a
  // stranger. The organisation leads because that is the party to the contract;
  // the person is who to call about it.
  it('names the organisation first, then the person', () => {
    expect(copy.requestBuyerLabel('Ibu Diana Prasetyo', 'PT Pangan Nusantara'))
      .toBe('PT Pangan Nusantara (Ibu Diana Prasetyo)')
  })

  it('falls back to the person when there is no organisation', () => {
    expect(copy.requestBuyerLabel('Ibu Diana Prasetyo', null)).toBe('Ibu Diana Prasetyo')
    expect(copy.requestBuyerLabel('Ibu Diana Prasetyo', '  ')).toBe('Ibu Diana Prasetyo')
  })
})

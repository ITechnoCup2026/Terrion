import { describe, expect, it } from 'vitest'

import { inputItemLabel } from '@/lib/rdkk/label'

describe('inputItemLabel', () => {
  it('writes chemical formulae the way they are written', () => {
    expect(inputItemLabel('npk')).toBe('NPK')
    expect(inputItemLabel('sp36')).toBe('SP-36')
    expect(inputItemLabel('kcl')).toBe('KCl')
  })

  it('matches whatever case the slug arrives in', () => {
    expect(inputItemLabel('NPK')).toBe('NPK')
    expect(inputItemLabel(' Kcl ')).toBe('KCl')
  })

  it('leaves an ordinary word alone, for capitalize upstream', () => {
    expect(inputItemLabel('urea')).toBe('urea')
    expect(inputItemLabel('pupuk organik')).toBe('pupuk organik')
  })
})

import { describe, expect, it } from 'vitest'

import { KG_PER_SACK, toOrderLines } from './order'

const line = (inputItem: string, quantityKg: number, sources = ['Permentan 01/2025']) =>
  ({ inputItem, quantityKg, sources })

describe('toOrderLines', () => {
  it('converts kilograms into whole sacks', () => {
    expect(toOrderLines([line('urea', 500)])).toEqual([
      { item: 'urea', quantity: 10, unit: `karung ${KG_PER_SACK} kg`, quantityKg: 500 },
    ])
  })

  // You cannot buy four fifths of a sack, and rounding down would order less
  // fertiliser than the RDKK says the season needs -- the same silent
  // under-ordering aggregate.ts refuses to do at the cap.
  it('rounds a part sack up, never down', () => {
    expect(toOrderLines([line('npk', 7340)])[0].quantity).toBe(147)   // 146.8
    expect(toOrderLines([line('kcl', 50.1)])[0].quantity).toBe(2)
    expect(toOrderLines([line('sp36', 49.9)])[0].quantity).toBe(1)
  })

  it('keeps the exact kilograms alongside the rounded sacks', () => {
    expect(toOrderLines([line('urea', 7340)])[0].quantityKg).toBe(7340)
  })

  // A line with nothing to order is not a line. Ordering zero sacks of
  // something would put a meaningless row on a supplier's form.
  it('drops lines with no quantity', () => {
    expect(toOrderLines([line('urea', 0), line('npk', 120)]).map(l => l.item))
      .toEqual(['npk'])
  })

  it('returns nothing for an empty aggregate', () => {
    expect(toOrderLines([])).toEqual([])
  })

  it('preserves the order it was given', () => {
    expect(toOrderLines([line('kcl', 100), line('npk', 100), line('urea', 100)])
      .map(l => l.item)).toEqual(['kcl', 'npk', 'urea'])
  })
})

import { describe, it, expect } from 'vitest'
import { deriveNormals } from './normals'
import type { TempDay } from '@/lib/agronomy/types'

const day = (date: string, tmin: number, tmax: number): TempDay => ({ date, tmin, tmax })

describe('deriveNormals', () => {
  it('averages the daily mean across years for each day of the year', () => {
    const normals = deriveNormals([
      day('2023-01-01', 20, 28),   // mean 24
      day('2024-01-01', 22, 30),   // mean 26
      day('2025-01-01', 24, 32),   // mean 28
    ])
    expect(normals).toHaveLength(1)
    expect(normals[0].dayOfYear).toBe(1)
    expect(normals[0].meanC).toBeCloseTo(26, 5)
  })

  it('reports the year-to-year spread that drives the ensemble width', () => {
    const normals = deriveNormals([
      day('2023-01-01', 20, 28),
      day('2024-01-01', 22, 30),
      day('2025-01-01', 24, 32),
    ])
    // Sample SD of 24, 26, 28 is 2 — the same n-1 convention calibrate.ts uses.
    expect(normals[0].sdC).toBeCloseTo(2, 5)
  })

  it('emits one entry per distinct day of year, in order', () => {
    const normals = deriveNormals([
      day('2024-03-01', 20, 30),
      day('2024-01-01', 20, 30),
      day('2024-02-01', 20, 30),
    ])
    expect(normals.map(n => n.dayOfYear)).toEqual([1, 32, 61])
  })

  it('reports zero spread when a day has only one year behind it', () => {
    // Worth pinning: sd 0 collapses the ensemble to a single date. A backfill
    // that fetched only one year would produce this for every day.
    expect(deriveNormals([day('2024-01-01', 20, 30)])[0].sdC).toBe(0)
  })

  it('returns nothing for no weather', () => {
    expect(deriveNormals([])).toEqual([])
  })
})

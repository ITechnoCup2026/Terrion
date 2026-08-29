import { describe, expect, it } from 'vitest'

import { collisionBasis, collisionHeadline, staggerSentence, weekOfMonthLabel } from './copy'

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d))

describe('weekOfMonthLabel', () => {
  it('names the week and the month in Indonesian', () => {
    expect(weekOfMonthLabel(utc(2026, 10, 19))).toBe('minggu ke-3 Oktober')
  })

  it('counts the first seven days as week 1', () => {
    expect(weekOfMonthLabel(utc(2026, 10, 1))).toBe('minggu ke-1 Oktober')
    expect(weekOfMonthLabel(utc(2026, 10, 7))).toBe('minggu ke-1 Oktober')
  })

  it('rolls to week 2 on the eighth', () => {
    expect(weekOfMonthLabel(utc(2026, 10, 8))).toBe('minggu ke-2 Oktober')
  })

  it('handles the tail of a long month', () => {
    expect(weekOfMonthLabel(utc(2026, 1, 29))).toBe('minggu ke-5 Januari')
  })

  // Windows are midnight UTC; formatting in WIB would shift the label a day
  // and, on the 7th/8th boundary, name the wrong week.
  it('reads the date in UTC, not local time', () => {
    expect(weekOfMonthLabel(new Date('2026-10-08T00:00:00Z'))).toBe('minggu ke-2 Oktober')
  })
})

describe('collisionHeadline', () => {
  it('states how many plots, which week and how much', () => {
    expect(
      collisionHeadline({ plotCount: 19, totalPlots: 47, weekStart: utc(2026, 10, 19), tonnes: 112 }),
    ).toBe(
      '19 dari 47 lahan diproyeksikan panen pada minggu ke-3 Oktober — sekitar 112 ton dalam 7 hari.',
    )
  })

  it('formats tonnage the Indonesian way', () => {
    expect(
      collisionHeadline({ plotCount: 2, totalPlots: 47, weekStart: utc(2026, 10, 19), tonnes: 1234.56 }),
    ).toContain('sekitar 1.234,6 ton')
  })
})

describe('collisionBasis', () => {
  it('cites the capacity the cooperative set, when it set one', () => {
    expect(collisionBasis({ basis: 'capacity', threshold: 80, tonnes: 112 })).toBe(
      'di atas 80 t/minggu yang koperasi Anda tetapkan',
    )
  })

  // threshold = median * 2.5, so the multiple shown is against the median.
  it('expresses the median basis as a multiple of a typical week', () => {
    expect(collisionBasis({ basis: 'median', threshold: 100, tonnes: 124 })).toBe(
      '3,1× minggu tipikal Anda',
    )
  })

  it('does not divide by zero when there is no typical week', () => {
    expect(collisionBasis({ basis: 'median', threshold: 0, tonnes: 5 })).toBe(
      'di atas minggu tipikal Anda',
    )
  })
})

describe('staggerSentence', () => {
  it('phrases a positive shift as pushing planting later', () => {
    expect(staggerSentence({ blockIds: ['a', 'b', 'c', 'd', 'e', 'f'], shiftDays: 10, tonnesMoved: 40 })).toBe(
      'Geser tanam 6 blok sebesar +10 hari musim depan, atau siapkan penyimpanan untuk 40 ton.',
    )
  })

  it('phrases a negative shift as bringing planting forward', () => {
    expect(staggerSentence({ blockIds: ['a', 'b'], shiftDays: -7, tonnesMoved: 12.5 })).toBe(
      'Majukan tanam 2 blok sebesar 7 hari musim depan, atau siapkan penyimpanan untuk 12,5 ton.',
    )
  })

  it('agrees in number for a single block', () => {
    expect(staggerSentence({ blockIds: ['a'], shiftDays: 7, tonnesMoved: 3 })).toContain('1 blok')
  })
})

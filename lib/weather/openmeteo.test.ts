import { describe, it, expect } from 'vitest'
import { fetchHistory, fetchForecast } from './openmeteo'
import { utcDate } from '@/lib/agronomy/dates'

const calls: string[] = []

function fakeFetch(body: unknown, ok = true, status = 200) {
  return (async (url: string | URL) => {
    calls.push(String(url))
    return { ok, status, json: async () => body } as Response
  }) as unknown as typeof fetch
}

const daily = (time: string[], min: (number | null)[], max: (number | null)[]) =>
  ({ daily: { time, temperature_2m_min: min, temperature_2m_max: max } })

describe('openmeteo client', () => {
  it('zips the parallel arrays into one entry per day', async () => {
    const days = await fetchHistory(-7.25, 107.75, utcDate('2024-01-01'), utcDate('2024-01-02'),
      fakeFetch(daily(['2024-01-01', '2024-01-02'], [21, 22], [30, 31])))
    expect(days).toEqual([
      { date: '2024-01-01', tmin: 21, tmax: 30 },
      { date: '2024-01-02', tmin: 22, tmax: 31 },
    ])
  })

  it('drops a day with a missing reading rather than emitting NaN', async () => {
    // Open-Meteo returns null for gaps in the archive. A null reaching
    // gddForDay makes the running GDD total NaN and every downstream date
    // invalid, with no error anywhere.
    const days = await fetchHistory(-7.25, 107.75, utcDate('2024-01-01'), utcDate('2024-01-03'),
      fakeFetch(daily(['2024-01-01', '2024-01-02', '2024-01-03'], [21, null, 23], [30, 31, null])))
    expect(days).toEqual([{ date: '2024-01-01', tmin: 21, tmax: 30 }])
  })

  it('asks the archive API for the requested range in UTC', async () => {
    calls.length = 0
    await fetchHistory(-7.25, 107.75, utcDate('2015-01-01'), utcDate('2024-12-31'),
      fakeFetch(daily([], [], [])))
    expect(calls[0]).toContain('archive-api.open-meteo.com')
    expect(calls[0]).toContain('start_date=2015-01-01')
    expect(calls[0]).toContain('end_date=2024-12-31')
    expect(calls[0]).toContain('timezone=UTC')
  })

  it('asks the forecast API for 16 days', async () => {
    calls.length = 0
    await fetchForecast(-7.25, 107.75, fakeFetch(daily([], [], [])))
    expect(calls[0]).toContain('api.open-meteo.com')
    expect(calls[0]).toContain('forecast_days=16')
  })

  it('throws when the API returns an error status', async () => {
    await expect(fetchForecast(-7.25, 107.75, fakeFetch({}, false, 429)))
      .rejects.toThrow(/429/)
  })
})

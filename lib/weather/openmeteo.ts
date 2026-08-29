// The only place that talks to Open-Meteo. No API key, two endpoints:
// the archive for history, the forecast for the next 16 days.

import { toISODate } from '@/lib/agronomy/dates'
import type { TempDay } from '@/lib/agronomy/types'

const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const DAILY_FIELDS = 'temperature_2m_min,temperature_2m_max'
export const FORECAST_DAYS = 16

type DailyResponse = {
  daily?: {
    time?: string[]
    temperature_2m_min?: (number | null)[]
    temperature_2m_max?: (number | null)[]
  }
}

// Zip the three parallel arrays into TempDay, dropping any day missing a
// reading. Open-Meteo returns null for archive gaps, and a null reaching
// gddForDay turns the running total into NaN with no error raised anywhere.
function zipDaily(body: DailyResponse): TempDay[] {
  const daily = body.daily
  if (!daily?.time) return []
  const days: TempDay[] = []
  daily.time.forEach((date, i) => {
    const tmin = daily.temperature_2m_min?.[i]
    const tmax = daily.temperature_2m_max?.[i]
    if (typeof tmin === 'number' && typeof tmax === 'number') days.push({ date, tmin, tmax })
  })
  return days
}

// Shared query shape: one grid cell, daily min/max, UTC so dates never shift.
function baseUrl(endpoint: string, lat: number, lng: number): URL {
  const url = new URL(endpoint)
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lng))
  url.searchParams.set('daily', DAILY_FIELDS)
  url.searchParams.set('timezone', 'UTC')
  return url
}

// GET and parse, surfacing the status so a caller can back off on 429.
async function getDaily(url: URL, doFetch: typeof fetch): Promise<TempDay[]> {
  const response = await doFetch(url)
  if (!response.ok) {
    throw new Error(`Open-Meteo request failed with status ${response.status}: ${url.pathname}`)
  }
  return zipDaily(await response.json() as DailyResponse)
}

// Observed daily temperatures for a grid cell over a closed date range.
export async function fetchHistory(
  lat: number, lng: number, start: Date, end: Date, doFetch: typeof fetch = fetch,
): Promise<TempDay[]> {
  const url = baseUrl(ARCHIVE_URL, lat, lng)
  url.searchParams.set('start_date', toISODate(start))
  url.searchParams.set('end_date', toISODate(end))
  return getDaily(url, doFetch)
}

// The next 16 days for a grid cell — as far ahead as Open-Meteo forecasts.
export async function fetchForecast(
  lat: number, lng: number, doFetch: typeof fetch = fetch,
): Promise<TempDay[]> {
  const url = baseUrl(FORECAST_URL, lat, lng)
  url.searchParams.set('forecast_days', String(FORECAST_DAYS))
  return getDaily(url, doFetch)
}

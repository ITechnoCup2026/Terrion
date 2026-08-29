// Weather storage: fetch once per grid cell, share across every plot in it.
//
// Only the cron route and the demo generator may import this — it uses the
// service client, which bypasses row-level security.

import { createServiceClient } from '@/lib/supabase/server'
import { addDays, toISODate, utcDate } from '@/lib/agronomy/dates'
import type { ClimateNormals, TempDay } from '@/lib/agronomy/types'
import { deriveNormals } from './normals'
import { fetchForecast, fetchHistory } from './openmeteo'
import { snapToGrid } from './grid'

const HISTORY_YEARS = 10
/** Roughly 8 years of days; anything at least this full has been backfilled. */
const BACKFILL_COMPLETE_ROWS = 3000
const REFRESH_LOOKBACK_DAYS = 30
/** PostgREST caps a default select at 1000 rows, so page every read and write. */
const CHUNK = 1000
/** Matches MAX_PROJECTION_DAYS in predict.ts — no prediction looks further back. */
const MAX_HISTORY_DAYS = 400

type Cell = { gridLat: number; gridLng: number }

// Today at midnight UTC, so a run at 03:00 WIB does not land on yesterday.
function utcToday(now: Date): Date {
  return utcDate(toISODate(now))
}

// Write daily rows in pages, letting a re-run overwrite what it fetched before.
async function writeDaily(
  db: ReturnType<typeof createServiceClient>, cell: Cell, days: TempDay[],
): Promise<number> {
  const rows = days.map(d => ({
    grid_lat: cell.gridLat, grid_lng: cell.gridLng,
    date: d.date, temp_min: d.tmin, temp_max: d.tmax,
  }))
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db.from('weather_daily').upsert(rows.slice(i, i + CHUNK))
    if (error) throw new Error(`weather_daily upsert failed: ${error.message}`)
  }
  return rows.length
}

// Replace the cell's 366 normals with ones derived from the history just stored.
async function writeNormals(
  db: ReturnType<typeof createServiceClient>, cell: Cell, normals: ClimateNormals,
): Promise<void> {
  if (normals.length === 0) return
  const rows = normals.map(n => ({
    grid_lat: cell.gridLat, grid_lng: cell.gridLng,
    day_of_year: n.dayOfYear, mean_c: n.meanC, sd_c: n.sdC,
  }))
  const { error } = await db.from('weather_normals').upsert(rows)
  if (error) throw new Error(`weather_normals upsert failed: ${error.message}`)
}

// Fetch ten years for a cell and derive its normals, unless that already ran.
export async function backfillPlotGrid(
  gridLat: number, gridLng: number, now = new Date(),
): Promise<{ skipped: boolean; rows: number }> {
  const db = createServiceClient()
  const cell = { gridLat, gridLng }

  const { count, error } = await db.from('weather_daily')
    .select('date', { count: 'exact', head: true })
    .eq('grid_lat', gridLat).eq('grid_lng', gridLng)
  if (error) throw new Error(`weather_daily count failed: ${error.message}`)
  if ((count ?? 0) >= BACKFILL_COMPLETE_ROWS) return { skipped: true, rows: count ?? 0 }

  const end = utcToday(now)
  const days = await fetchHistory(gridLat, gridLng, addDays(end, -365 * HISTORY_YEARS), end)
  const written = await writeDaily(db, cell, days)
  // Normals come from the full history, so they must be derived after the
  // backfill, not from the 30-day refresh window.
  await writeNormals(db, cell, deriveNormals(days))
  return { skipped: false, rows: written }
}

// Snap a plot's coordinates to its cell and backfill it. Entry point for
// plot registration, which knows lat/lng but not the grid.
export async function backfillForPlot(lat: number, lng: number, now = new Date()) {
  const { gridLat, gridLng } = snapToGrid(lat, lng)
  return backfillPlotGrid(gridLat, gridLng, now)
}

// Every distinct grid cell that has at least one plot in it.
async function occupiedCells(
  db: ReturnType<typeof createServiceClient>,
): Promise<Cell[]> {
  const cells = new Map<string, Cell>()
  for (let from = 0; ; from += CHUNK) {
    const { data, error } = await db.from('plot')
      .select('grid_lat, grid_lng').range(from, from + CHUNK - 1)
    if (error) throw new Error(`plot scan failed: ${error.message}`)
    for (const row of data ?? []) {
      if (row.grid_lat == null || row.grid_lng == null) continue
      const gridLat = Number(row.grid_lat)
      const gridLng = Number(row.grid_lng)
      cells.set(`${gridLat}|${gridLng}`, { gridLat, gridLng })
    }
    if (!data || data.length < CHUNK) break
  }
  return [...cells.values()]
}

// Daily cron: top up recent observations and the forecast for every cell in
// use, backfilling any cell that has never been fetched.
export async function refreshAllGrids(now = new Date()): Promise<{
  cells: number; rowsWritten: number; backfilled: number; failed: string[]
}> {
  const db = createServiceClient()
  const cells = await occupiedCells(db)
  const end = utcToday(now)
  let rowsWritten = 0
  let backfilled = 0
  const failed: string[] = []

  for (const cell of cells) {
    // One bad cell must not abort the whole run — the rest still need updating.
    try {
      const { skipped } = await backfillPlotGrid(cell.gridLat, cell.gridLng, now)
      if (!skipped) {
        backfilled++
        continue    // the backfill already covers today
      }
      const recent = await fetchHistory(
        cell.gridLat, cell.gridLng, addDays(end, -REFRESH_LOOKBACK_DAYS), end)
      const forecast = await fetchForecast(cell.gridLat, cell.gridLng)
      // Observed second: a real reading must win over a forecast for the same day.
      rowsWritten += await writeDaily(db, cell, [...forecast, ...recent])
    } catch (e) {
      failed.push(`${cell.gridLat},${cell.gridLng}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { cells: cells.length, rowsWritten, backfilled, failed }
}

/** weather_daily and weather_normals are public-read, so a page may pass its
 *  own request-scoped client rather than pulling the service client — which
 *  bypasses tenancy — into the render path. */
export type WeatherReader = Pick<ReturnType<typeof createServiceClient>, 'from'>

// Read a cell's stored weather back for predictHarvest.
export async function loadWeatherFor(
  gridLat: number, gridLng: number, since?: Date, now = new Date(),
  client?: WeatherReader,
): Promise<{ observed: TempDay[]; normals: ClimateNormals }> {
  const db = client ?? createServiceClient()
  const from = since ?? addDays(utcToday(now), -MAX_HISTORY_DAYS)

  // Page the read: a ten-year backfill is ~3650 rows and PostgREST would
  // silently return only the first 1000, quietly shortening every history.
  const daily: { date: string; temp_min: number; temp_max: number }[] = []
  for (let offset = 0; ; offset += CHUNK) {
    const { data, error } = await db.from('weather_daily')
      .select('date, temp_min, temp_max')
      .eq('grid_lat', gridLat).eq('grid_lng', gridLng)
      .gte('date', toISODate(from))
      .order('date')
      .range(offset, offset + CHUNK - 1)
    if (error) throw new Error(`weather_daily read failed: ${error.message}`)
    daily.push(...(data ?? []))
    if (!data || data.length < CHUNK) break
  }

  const { data: normals, error: normalsError } = await db.from('weather_normals')
    .select('day_of_year, mean_c, sd_c')
    .eq('grid_lat', gridLat).eq('grid_lng', gridLng)
    .order('day_of_year')
  if (normalsError) throw new Error(`weather_normals read failed: ${normalsError.message}`)

  return {
    observed: daily.map(r => ({
      date: r.date, tmin: Number(r.temp_min), tmax: Number(r.temp_max),
    })),
    normals: (normals ?? []).map(r => ({
      dayOfYear: r.day_of_year, meanC: Number(r.mean_c), sdC: Number(r.sd_c),
    })),
  }
}

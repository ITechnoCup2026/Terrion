import { refreshAllGrids } from '@/lib/weather/sync'

// Each cell costs two Open-Meteo calls; a first run backfills ten years.
// 60s is the Vercel Hobby ceiling — raise it if the co-op count outgrows it.
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  // An unset secret must fail closed. Comparing against `Bearer ${undefined}`
  // would let anyone in by sending the literal string "Bearer undefined".
  if (!secret) {
    return new Response('CRON_SECRET is not configured', { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorised', { status: 401 })
  }

  const result = await refreshAllGrids()
  // A partial failure still returns 200: the cron succeeded, some cells did
  // not. `failed` carries them so a run is never silently half-done.
  return Response.json(result)
}

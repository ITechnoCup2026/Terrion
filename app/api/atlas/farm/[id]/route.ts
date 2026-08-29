import { loadAtlasFarm } from '@/lib/atlas/load'

/**
 * One cooperative's farm, for the Atlas visit.
 *
 * Public by design: the Atlas is readable without a session, and this returns
 * only what `public_plot` exposes — no coordinates, no NIK, no buyer identity.
 * Fetched per farm rather than shipped with the map because nobody opens forty
 * of them, and loading all of them up front would pay for every one.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // A malformed id is a 400, not a database round trip.
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response('Bad request', { status: 400 })
  }

  const farm = await loadAtlasFarm(id)
  if (!farm) return new Response('Not found', { status: 404 })

  return Response.json(farm, {
    // Land does not change minute to minute, and this is the same answer for
    // every visitor, so a shared cache is safe here.
    headers: { 'cache-control': 'public, max-age=60, s-maxage=300' },
  })
}

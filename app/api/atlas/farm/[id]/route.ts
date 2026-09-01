import { NextResponse } from 'next/server'

import { isBackendDown } from '@/lib/api/client'
import { loadAtlasFarm } from '@/lib/atlas/load'

/**
 * Backs FarmView.tsx's client-side fetch. It's a Client Component (owns an
 * Escape-key handler and open/close animation), so it can't call apiFetch()
 * (server-only) directly -- this thin route is the one legitimate local API
 * route in an otherwise Server-Component-only app.
 *
 * The three failures stay three statuses rather than collapsing into 404.
 * FarmView shows the same panel for all of them, but a 404 in the network tab
 * says "this cooperative is not there" and a 502 says "the backend is down",
 * and whoever is debugging an empty panel at 6am needs to know which.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const farm = await loadAtlasFarm(id)
    if (!farm) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json(farm)
  } catch (error) {
    console.error('[atlas] farm fetch failed', error)
    return isBackendDown(error)
      ? NextResponse.json({ error: 'backend_unavailable' }, { status: 502 })
      : NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

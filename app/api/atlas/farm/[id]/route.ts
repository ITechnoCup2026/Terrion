import { NextResponse } from 'next/server'

import { loadAtlasFarm } from '@/lib/atlas/load'

/**
 * Backs FarmView.tsx's client-side fetch. It's a Client Component (owns an
 * Escape-key handler and open/close animation), so it can't call apiFetch()
 * (server-only) directly -- this thin route is the one legitimate local API
 * route in an otherwise Server-Component-only app.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const farm = await loadAtlasFarm(id)
  if (!farm) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(farm)
}

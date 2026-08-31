/**
 * The one place this app talks HTTP to the Terrion backend.
 *
 * Every response is `{ data }` on success or `{ errors }` on failure, per
 * the backend's API contract. Two endpoints (blocks/:id/split, stagger) attach a
 * `data` payload of numbers alongside the error code on a 422, so `ApiError`
 * carries both rather than discarding one.
 *
 * Server-only: takes `accessToken` as a parameter instead of reading cookies
 * itself, so it has no dependency on next/headers and stays trivially
 * testable. Callers get the token from lib/auth/session.ts.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

export class ApiError extends Error {
  status: number
  code: string
  data?: unknown

  constructor(status: number, code: string, data?: unknown) {
    super(code)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }
}

type ApiRequestInit = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  /** Supabase access token to attach as `Authorization: Bearer`. Omit for public endpoints. */
  accessToken?: string | null
  cache?: RequestCache
}

export async function apiFetch<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  if (!BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_URL belum diatur.')
  }

  const url = new URL(path, BASE_URL)
  if (init.query) {
    for (const [key, value] of Object.entries(init.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }

  const res = await fetch(url, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(init.accessToken ? { Authorization: `Bearer ${init.accessToken}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: init.cache ?? 'no-store',
  })

  // 204 No Content (e.g. PATCH /api/supply-requests/:id) has no body to parse.
  if (res.status === 204) return undefined as T

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    const code = typeof json?.errors === 'string' ? json.errors : `http_${res.status}`
    throw new ApiError(res.status, code, json?.data)
  }

  return json.data as T
}

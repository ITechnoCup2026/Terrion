import { createServerClient as createSSRClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './types.gen'

/** Reads an env var, failing loudly here rather than as a confusing error later. */
function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

/**
 * The request's own client, carrying the signed-in user's cookies.
 * RLS applies, so this is what pages, components and Server Actions use.
 * Build a new one per request — never share one across requests.
 */
export async function createServerClient() {
  const store = await cookies()

  return createSSRClient<Database>(
    required('NEXT_PUBLIC_SUPABASE_URL'),
    required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: cookiesToSet => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              store.set(name, value, options)
            }
          } catch {
            // Server Components are not allowed to write cookies. proxy.ts
            // refreshes the session on every request, so losing the write
            // here costs nothing.
          }
        },
      },
    },
  )
}

/**
 * Bypasses RLS completely — every row of every cooperative is visible.
 *
 * ONLY the weather cron route, the demo generator script and the buyer signup
 * action may import this. The signup action needs it because app_user has a
 * self_read policy and no insert policy, so nothing else can create a profile
 * row; it hard-codes role 'buyer' for exactly that reason.
 *
 * Importing it into a page or component silently disables tenancy: no error,
 * no warning, every farmer sees every other farmer's data.
 */
export function createServiceClient() {
  return createClient<Database>(
    required('NEXT_PUBLIC_SUPABASE_URL'),
    required('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types.gen'

/**
 * The browser's client, for Client Components that talk to Supabase directly.
 * Only ever holds the anon key, so RLS governs everything it can reach.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

import { createBrowserClient } from '@supabase/ssr'

/**
 * The browser-side Supabase client. Only auth is used here -- this project's
 * data lives behind the Terrion backend (lib/api/client.ts), not Postgrest --
 * so this exists purely so the login form can call signInWithPassword() and
 * keep its session cookie in sync client-side.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

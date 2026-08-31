import { cookies } from 'next/headers'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'

/**
 * The server-side Supabase client, scoped to auth only.
 *
 * This project's data lives behind the Terrion backend (lib/api/client.ts),
 * not Postgrest, so the only thing called on the client this returns is
 * `.auth.*` -- getSession/getUser to read who is signed in, and
 * signInWithPassword/signOut from the login and sign-out actions. There is no
 * service-role client: nothing in this frontend talks to Supabase's data API
 * with elevated privileges, because it never talks to Supabase's data API at
 * all.
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Called from a Server Component render, where cookies can't be
            // written. proxy.ts refreshes the session instead.
          }
        },
      },
    },
  )
}

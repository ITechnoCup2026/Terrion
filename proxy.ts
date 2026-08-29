import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Keeps the signed-in session alive.
 *
 * Supabase auth tokens expire quickly and refresh when read, but pages and
 * Server Components cannot write cookies — so without this the refreshed token
 * is thrown away and users get logged out at random. Runs before every request,
 * refreshes the session, and writes the new cookies onto the response.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
          // Stops a CDN caching a response that carries someone's session.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value)
          }
        },
      },
    },
  )

  // Reading the user is what triggers the refresh. getUser verifies the token
  // with Supabase; getSession would trust an unverified cookie.
  await supabase.auth.getUser()

  return response
}

export const config = {
  // Everything except static assets — running auth on those would block
  // CSS and images from loading.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sprites|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}

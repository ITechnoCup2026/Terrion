'use client'

import { ArrowRight, Lock, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { signIn } from '@/app/actions/login'
import { AuthField, AuthPasswordField } from '@/components/auth/fields'
import { AuthError } from '@/components/auth/frame'
import { homeFor } from '@/lib/auth/display'

/**
 * The sign-in form.
 *
 * Lifted out of app/(auth)/login/page.tsx so the page itself can go back to
 * being a server component: the poster beside it draws the real archipelago,
 * which is read from disk on the server, and an async server component cannot
 * be imported into a `'use client'` module. Only the fields need the browser,
 * so only the fields are shipped to it.
 *
 * There is no role picker and there never was one. The role comes back in the
 * login response itself -- POST /api/auth/login answers with a UserResponse --
 * so one form authenticates everyone and routes each of them home.
 */
/**
 * A redirect target is only ever a same-origin absolute path. `next` arrives
 * from the query string, and a target taken on trust is an open redirect --
 * `//evil.example` is a protocol-relative URL, not a path. The same rule
 * app/actions/auth.ts applies to signing out.
 */
function safeNext(next: string | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null
  return next
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const result = await signIn({ email, password })
      if (!result.ok) {
        setError(result.message)
        return
      }
      // Where they came from, if they came from somewhere; otherwise the role
      // the backend returned decides. A listing page sends buyers here as
      // ?next=/catalog/<id> and used to get them back a screen they had not
      // asked for -- they pressed "Masuk" on one harvest and arrived at a list
      // of all of them, with the request form they were three seconds from
      // filling in now several clicks away.
      router.push(safeNext(next) ?? homeFor(result.role))
      router.refresh()
    } catch {
      setError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="panel rise mt-7 flex flex-col gap-4 p-6 sm:p-7"
      style={{ ['--rise-delay' as string]: '80ms' }}
    >
      <AuthField
        icon={Mail}
        label="Email"
        type="email"
        value={email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        required
        autoComplete="email"
        placeholder="nama@email.com"
      />

      <AuthPasswordField
        icon={Lock}
        label="Kata sandi"
        value={password}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        placeholder="••••••••"
      />

      {error && <AuthError>{error}</AuthError>}

      <button
        type="submit"
        disabled={pending}
        className="pill pill-solid interactive lift group mt-2 w-full justify-center text-sm font-semibold disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? 'Memproses…' : 'Masuk'}
        {!pending && (
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-1"
          />
        )}
      </button>
    </form>
  )
}

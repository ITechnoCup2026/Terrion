'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/client'

// Only same-origin paths. An open redirect would let a crafted login link
// bounce a signed-in user to somebody else's site.
function safeNext(raw: string | null): string | null {
  if (!raw) return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

/**
 * The sign-in page.
 *
 * `useSearchParams` opts a client component out of prerendering, so the form
 * has to sit under a Suspense boundary. Everything that does NOT read search
 * params stays outside it: with the heading inside too — and a `null` fallback
 * — the server sent a completely empty document, and the page was blank until
 * JavaScript arrived. Now the mark and the heading are in the first response
 * and only the form waits, behind a skeleton the height of the form so nothing
 * jumps when it swaps in.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* The way back. Both auth pages are reached from the public
            header, which they then replace -- without this the only exit is
            the browser's back button, and somebody who arrived by typing the
            URL has no exit at all. */}
        <Link
          href="/"
          className="interactive mb-6 inline-block text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Kembali ke beranda
        </Link>

        <div className="rise flex flex-col items-center gap-3 text-center">
          {/* The mark links home too: it is the first thing anybody clicks
              looking for a way out of a login screen. */}
          <Link href="/" aria-label="Terrion, kembali ke beranda" className="interactive">
            <Logo size={44} withWordmark={false} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Masuk ke Terrion</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Kalender tanam bersama untuk koperasi tani
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <div
              aria-hidden
              className="mt-7 h-[19.5rem] animate-pulse rounded-xl border border-border bg-card"
            />
          }
        >
          <LoginForm />
        </Suspense>

        {/* One signup link, not two. A buyer creates their own account; a
            cooperative is verified offline and registered by an operator, so
            saying so beats a dead link. */}
        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
          Pembeli baru?{' '}
          <Link href="/signup" className="underline underline-offset-2 hover:text-foreground">
            Daftar di sini
          </Link>
          . Akun koperasi dibuat oleh pengelola setelah verifikasi.{' '}
          <Link href="/catalog" className="underline underline-offset-2 hover:text-foreground">
            Lihat katalog tanpa masuk
          </Link>
        </p>
      </div>
    </main>
  )
}

function LoginForm() {
  const router = useRouter()
  const next = safeNext(useSearchParams().get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Signs in, then refreshes so the server re-renders knowing who this is.
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const { data, error } = await createClient().auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email atau kata sandi salah')
      setPending(false)
      return
    }

    if (next) {
      router.push(next)
      router.refresh()
      return
    }

    // Otherwise land where this account can actually work. A buyer sent to a
    // cooperative screen only gets bounced back out by the (app) layout, which
    // reads as a glitch.
    const { data: profile } = await createClient()
      .from('app_user').select('role').eq('id', data.user.id).maybeSingle()

    router.push(profile?.role === 'buyer' ? '/catalog' : '/dashboard')
    router.refresh()
  }

  const field =
    'interactive h-11 rounded-lg border border-input bg-background px-3 text-base font-normal text-foreground hover:border-ring/40 focus:border-ring focus:outline-none'

  return (
    <form
      onSubmit={onSubmit}
      className="rise mt-7 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
      style={{ ['--rise-delay' as string]: '80ms' }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
        Email
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="nama@koperasi.id"
          className={`${field} placeholder:text-muted-foreground/60`}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
        Kata sandi
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className={field}
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="interactive mt-1">
        {pending ? 'Memproses…' : 'Masuk'}
      </Button>
    </form>
  )
}

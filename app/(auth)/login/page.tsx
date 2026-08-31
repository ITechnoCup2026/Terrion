'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/Logo'

/**
 * The sign-in page.
 *
 * This repo has no backend attached, so there is nothing this form can
 * actually sign in against -- submitting always shows the same refusal. Kept
 * as a real page, rather than deleted, so the header's "Masuk" link and the
 * (app) layout's redirect both still land somewhere.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="interactive mb-6 inline-block text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Kembali ke beranda
        </Link>

        <div className="rise flex flex-col items-center gap-3 text-center">
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('Belum ada backend yang terhubung untuk memeriksa akun.')
    setPending(false)
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

'use client'

import { Building2, Lock, Sprout, User, UserCog } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import { AuthBackButton } from '@/components/auth/AuthBackButton'
import { AuthShowcasePanel } from '@/components/auth/AuthShowcasePanel'
import { AuthField, AuthPasswordField } from '@/components/auth/fields'
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
    <main className="grid min-h-dvh lg:grid-cols-2">
      <AuthShowcasePanel />

      <div className="relative flex flex-col items-center justify-center bg-background p-6">
        <AuthBackButton />

        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="interactive mb-6 inline-block text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground lg:hidden"
          >
            Kembali ke beranda
          </Link>

          <div className="rise flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <Link href="/" aria-label="Terrion, kembali ke beranda" className="interactive lg:hidden">
              <Logo size={44} withWordmark={false} />
            </Link>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ background: 'var(--terrion-green-50)', color: 'var(--terrion-green-700)' }}
            >
              <Sprout aria-hidden className="size-3.5" />
              Selamat datang kembali
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Masuk ke Terrion</h1>
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

          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground lg:text-left">
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
      </div>
    </main>
  )
}

type LoginRole = 'koperasi' | 'pengurus' | 'pembeli'

const roleCopy: Record<LoginRole, { label: string; placeholder: string; icon: typeof Building2 }> = {
  koperasi: { label: 'Koperasi', placeholder: 'nama@koperasi.id', icon: Building2 },
  pengurus: { label: 'Pengurus', placeholder: 'pengurus@koperasi.id', icon: UserCog },
  pembeli: { label: 'Pembeli', placeholder: 'nama@perusahaan.co.id', icon: User },
}

const loginRoles = Object.keys(roleCopy) as LoginRole[]

function LoginForm() {
  const searchParams = useSearchParams()
  const requestedRole = searchParams.get('role')
  const initialRole = loginRoles.includes(requestedRole as LoginRole)
    ? (requestedRole as LoginRole)
    : 'koperasi'

  const [role, setRole] = useState<LoginRole>(initialRole)
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

  return (
    <form
      onSubmit={onSubmit}
      className="rise relative mt-7 flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
      style={{ ['--rise-delay' as string]: '80ms' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 -z-10 h-32 w-32 rounded-full"
        style={{ background: 'color-mix(in oklch, var(--terrion-gold-500), transparent 88%)' }}
      />

      {/* Koperasi and pembeli sign in against the same form, but the two
          audiences never think of themselves as filling in the same box --
          the tabs are just a label, not a different flow underneath. */}
      <div
        role="tablist"
        aria-label="Masuk sebagai"
        className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
      >
        {loginRoles.map(key => {
          const isActive = role === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setRole(key)}
              className={
                'interactive rounded-md py-1.5 text-sm font-medium transition-colors ' +
                (isActive
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground')
              }
            >
              {roleCopy[key].label}
            </button>
          )
        })}
      </div>

      <AuthField
        icon={roleCopy[role].icon}
        label="Email"
        type="email"
        value={email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        required
        autoComplete="email"
        placeholder={roleCopy[role].placeholder}
      />

      <AuthPasswordField
        icon={Lock}
        label="Kata sandi"
        value={password}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />

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

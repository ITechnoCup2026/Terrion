'use client'

import { Lock, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'

import { signIn } from '@/app/actions/login'
import { AuthBackButton } from '@/components/auth/AuthBackButton'
import { AuthShowcasePanel } from '@/components/auth/AuthShowcasePanel'
import { AuthField, AuthPasswordField } from '@/components/auth/fields'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/Logo'
import { homeFor } from '@/lib/auth/display'

/** The sign-in page. The role comes back in the login response itself --
 *  POST /api/auth/login answers with a UserResponse -- so a single login form
 *  authenticates all users and routes them to their corresponding home. */
export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <AuthShowcasePanel />

      <div className="relative flex flex-col items-center justify-center bg-card p-6">
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
                className="mt-7 h-[19.5rem] animate-pulse rounded-lg border border-border bg-card"
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

function LoginForm() {
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
      // Where they land follows the role the backend returned
      router.push(homeFor(result.role))
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
      className="rise relative mt-7 flex flex-col gap-4 overflow-hidden rounded-lg border border-border bg-card p-6"
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


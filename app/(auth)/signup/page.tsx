import Link from 'next/link'

import { AuthBackButton } from '@/components/auth/AuthBackButton'
import { AuthShowcasePanel } from '@/components/auth/AuthShowcasePanel'
import { SignupForm } from '@/components/auth/SignupForm'
import { Logo } from '@/components/ui/Logo'

export const metadata = { title: 'Daftar sebagai pembeli' }

/**
 * Buyer registration.
 *
 * This repo has no backend attached -- SignupForm's action always refuses to
 * register anyone -- but the page is kept real so /signup has somewhere to go.
 */
export default function SignupPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <AuthShowcasePanel variant="signup" />

      <div className="relative flex flex-col items-center justify-center bg-card p-6 pt-16 sm:pt-6">
        <AuthBackButton />

        <div className="w-full max-w-sm">
          <div className="rise flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <Link href="/" aria-label="Terrion, kembali ke beranda" className="interactive lg:hidden">
              <Logo size={44} withWordmark={false} />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Daftar sebagai pembeli</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Untuk menelusuri katalog dan mengajukan permintaan pasokan
              </p>
            </div>
          </div>

          <SignupForm />

          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground lg:text-left">
            Mendaftarkan koperasi? Akun koperasi dibuat oleh pengelola setelah verifikasi.{' '}
            <Link href="/login" className="underline underline-offset-2 hover:text-foreground">
              Sudah punya akun? Masuk
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

import Link from 'next/link'

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
            <h1 className="text-xl font-semibold text-foreground">Daftar sebagai pembeli</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Untuk menelusuri katalog dan mengajukan permintaan pasokan
            </p>
          </div>
        </div>

        <SignupForm />

        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
          Mendaftarkan koperasi? Akun koperasi dibuat oleh pengelola setelah verifikasi.{' '}
          <Link href="/login" className="underline underline-offset-2 hover:text-foreground">
            Sudah punya akun? Masuk
          </Link>
        </p>
      </div>
    </main>
  )
}

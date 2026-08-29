import Link from 'next/link'

import { SignupForm } from '@/components/auth/SignupForm'
import { Logo } from '@/components/ui/Logo'

export const metadata = { title: 'Daftar sebagai pembeli' }

/**
 * Buyer registration.
 *
 * A server component wrapping a client form, so the mark, the heading and the
 * explanation are all in the first response. The login page had to learn this
 * the hard way: with the whole page behind a Suspense boundary and a null
 * fallback, the server sent an empty document.
 *
 * Only buyers land here. A cooperative account is created by an operator after
 * an offline check, and the copy below says so rather than leaving somebody to
 * work out why their koperasi is not on the form.
 */
export default function SignupPage() {
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
              looking for a way out of a signup screen. */}
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

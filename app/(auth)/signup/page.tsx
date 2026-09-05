import { AuthBackButton } from '@/components/auth/AuthBackButton'
import { AuthShowcasePanel } from '@/components/auth/AuthShowcasePanel'
import { AuthHeading, AuthNote } from '@/components/auth/frame'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata = { title: 'Daftar sebagai pembeli' }

/**
 * Buyer registration -- the same frame as /login, with the poster's copy
 * turned towards the market rather than the season, because the two screens
 * are one step apart and a visitor who bounces between them should feel a
 * change of subject, not a change of site.
 */
export default function SignupPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <AuthShowcasePanel variant="signup" />

      <div className="flex min-w-0 flex-col justify-center bg-background px-5 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-12">
        <div className="mx-auto flex w-full max-w-md flex-col">
          <AuthBackButton />

          <AuthHeading
            title="Ajukan permintaan"
            emphasis="langsung ke koperasi"
            subtitle="Untuk menelusuri katalog pasokan dan mengajukan permintaan tanpa perantara."
          />

          <SignupForm />

          <AuthNote
            links={[
              { href: '/login', label: 'Sudah punya akun? Masuk' },
              { href: '/catalog', label: 'Lihat katalog dulu' },
            ]}
          >
            Formulir ini membuat akun pembeli. Pendaftaran koperasi ditangani
            pengelola setelah verifikasi legalitas, bukan melalui halaman ini.
          </AuthNote>
        </div>
      </div>
    </main>
  )
}

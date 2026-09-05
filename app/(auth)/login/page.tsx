import { AuthBackButton } from '@/components/auth/AuthBackButton'
import { AuthShowcasePanel } from '@/components/auth/AuthShowcasePanel'
import { AuthHeading, AuthNote } from '@/components/auth/frame'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = { title: 'Masuk ke Terrion' }

/**
 * The sign-in page: the landing poster on the left, the form on the right.
 *
 * A server component again. It used to be `'use client'` from the first line
 * purely because the form's state lived in the same file, which meant the
 * brand panel beside it could never draw anything the server knows -- and the
 * archipelago, the one picture in this product that is made of real data, is
 * read from disk. <LoginForm> is the only part that needs the browser now.
 *
 * The poster carries the mark on `lg` and up; below that it is hidden and the
 * heading carries it instead, because there is no room for both next to a
 * form on a phone.
 *
 * `?next=` is read here rather than through useSearchParams() inside the form,
 * so the form keeps no dependency on the URL and the page needs no Suspense
 * boundary around it.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const next = (await searchParams).next
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <AuthShowcasePanel />

      <div className="flex min-w-0 flex-col justify-center bg-background px-5 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-12">
        <div className="mx-auto flex w-full max-w-md flex-col">
          <AuthBackButton />

          <AuthHeading
            title="Lanjutkan ke kalender"
            emphasis="tanam bersama"
            subtitle="Satu akun untuk mencatat lahan, membaca proyeksi panen, dan menjawab permintaan pasokan."
          />

          <LoginForm next={typeof next === 'string' ? next : undefined} />

          <AuthNote
            links={[
              { href: '/signup', label: 'Daftar sebagai pembeli' },
              { href: '/catalog', label: 'Lihat katalog tanpa masuk' },
            ]}
          >
            Akun koperasi dibuat oleh pengelola setelah verifikasi legalitas
            koperasi. Pembeli dapat mendaftar sendiri, dan katalog pasokan tetap
            terbuka tanpa perlu masuk.
          </AuthNote>
        </div>
      </div>
    </main>
  )
}

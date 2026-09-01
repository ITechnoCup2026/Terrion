import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { MessageCard } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'

/**
 * What a signed-in reader sees when the backend cannot be reached.
 *
 * Deliberately not a redirect to /login. Being signed out and being unable to
 * ask who you are produce the same silence, and the app used to answer both
 * with the login page -- which tells a pengurus their session expired, sends
 * them to retype a password that was never wrong, and fails again there. The
 * screen has to say the server is down, because that is the one fact that
 * decides what the reader should do: wait, not re-authenticate.
 *
 * A Server Component, so it can render from inside the layout's own guard --
 * an error.tsx catches a layout's children, never the layout itself. Hence a
 * plain link rather than a reset() button: an <a> to the current path reloads
 * without needing a client boundary, and works with JavaScript still loading.
 */
export function BackendDownState({ retryHref = '/dashboard' }: { retryHref?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <Logo size={40} withWordmark={false} />

      <MessageCard
        className="w-full max-w-md"
        title="Server sedang tidak bisa dihubungi"
        action={
          <Link href={retryHref} className={buttonVariants()}>
            Coba lagi
          </Link>
        }
      >
        Data Anda aman dan Anda masih masuk — aplikasi hanya belum bisa
        menghubungi server. Tunggu beberapa saat, lalu muat ulang. Kalau terus
        berulang, hubungi pengelola Terrion.
      </MessageCard>
    </div>
  )
}

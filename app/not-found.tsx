import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { MessageCard } from '@/components/ui/Card'
import { Page } from '@/components/ui/Page'
import { isBackendDown } from '@/lib/api/client'
import { homeFor } from '@/lib/auth/display'
import { currentAppUser, type AppUser } from '@/lib/auth/session'

export default async function NotFound() {
  let user: AppUser | null = null
  try {
    user = await currentAppUser()
  } catch (error) {
    if (!isBackendDown(error)) throw error
  }

  const target = user ? homeFor(user.role) : '/'
  const actionLabel = user ? (user.role === 'buyer' ? 'Ke beranda' : 'Ke dasbor') : 'Kembali ke beranda'

  return (
    <Page className="flex flex-1 items-center justify-center">
      <MessageCard
        className="w-full"
        title="Halaman tidak ditemukan"
        action={
          <Link href={target} className={buttonVariants()}>
            {actionLabel}
          </Link>
        }
      >
        Halaman ini mungkin sudah dipindahkan atau tidak tersedia.
      </MessageCard>
    </Page>
  )
}

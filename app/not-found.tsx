import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { MessageCard } from '@/components/ui/Card'
import { Page } from '@/components/ui/Page'

/**
 * The 404, in Indonesian.
 *
 * Reached most often by a shared catalogue link whose harvest week has passed:
 * listings are derived from the projection, so a URL that resolved last month
 * legitimately stops existing. That is not a broken link and should not read
 * like one -- it says the listing is gone and points back at the catalogue.
 */
export default function NotFound() {
  return (
    <Page className="flex flex-1 items-center justify-center">
      <MessageCard
        className="w-full"
        title="Halaman tidak ditemukan"
        action={
          <Link href="/catalog" className={buttonVariants()}>
            Lihat katalog
          </Link>
        }
      >
        Halaman ini mungkin sudah dipindahkan, atau listing panennya sudah lewat.
        Katalog hanya menampilkan panen yang diproyeksikan dalam 12 minggu ke depan.
      </MessageCard>
    </Page>
  )
}

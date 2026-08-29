import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'

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
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm font-semibold text-foreground">Halaman tidak ditemukan</p>
        <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
          Halaman ini mungkin sudah dipindahkan, atau listing panennya sudah lewat.
          Katalog hanya menampilkan panen yang diproyeksikan dalam 12 minggu ke depan.
        </p>
        <Link href="/catalog" className={`${buttonVariants()} mt-4`}>
          Lihat katalog
        </Link>
      </div>
    </div>
  )
}

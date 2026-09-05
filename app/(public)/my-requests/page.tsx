import { Store } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { MyRequestsView } from '@/components/requests/MyRequestsView'
import { buttonVariants } from '@/components/ui/button'
import { Page, PageHeader } from '@/components/ui/Page'
import { loadAtlasCooperativesIfUp } from '@/lib/atlas/load'
import { currentAppUser } from '@/lib/auth/session'
import { loadCommodities } from '@/lib/commodities/load'
import { loadSupplyRequests } from '@/lib/supply-requests/load'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Permintaan Pasokan Saya · Terrion' }

export const dynamic = 'force-dynamic'

export default async function MyRequestsPage() {
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (user.role !== 'buyer') redirect('/requests')

  const [rows, commodities, cooperatives] = await Promise.all([
    loadSupplyRequests(),
    loadCommodities(),
    loadAtlasCooperativesIfUp(),
  ])

  return (
    <Page className="flex max-w-7xl flex-col gap-6 pb-16">
      <PageHeader
        title="Permintaan pasokan saya"
        description="Pengajuan pasokan hasil panen ke koperasi mitra untuk dipantau status persetujuannya."
        actions={
          <Link
            href="/catalog"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'interactive gap-2 font-medium bg-[var(--terrion-green-700)] hover:bg-[var(--terrion-green-900)] text-white shadow-xs',
            )}
          >
            <Store className="size-4" />
            Jelajahi Katalog Baru
          </Link>
        }
      />

      <MyRequestsView
        requests={rows}
        commodities={commodities}
        cooperatives={cooperatives ?? []}
      />

      <p className="border-t border-border/80 pt-4 text-xs leading-relaxed text-muted-foreground text-center sm:text-left">
        Kesepakatan harga final, pembayaran, dan administrasi serah terima komoditas diatur langsung antara pihak pembeli dan pengurus koperasi.
      </p>
    </Page>
  )
}

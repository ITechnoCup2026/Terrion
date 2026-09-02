import Link from 'next/link'
import { redirect } from 'next/navigation'

import { MyRequestsView } from '@/components/requests/MyRequestsView'
import { buttonVariants } from '@/components/ui/button'
import { Page, PageHeader } from '@/components/ui/Page'
import { loadAtlasCooperativesIfUp } from '@/lib/atlas/load'
import { currentAppUser } from '@/lib/auth/session'
import { loadCommodities } from '@/lib/commodities/load'
import { loadSupplyRequests } from '@/lib/supply-requests/load'

export const metadata = { title: 'Permintaan Saya & Status Kontrak' }

// The whole point of the page is the status, and a cooperative can change it
// at any moment. A cached answer here would tell a buyer they are still
// waiting on a request that was accepted this morning.
export const dynamic = 'force-dynamic'

export default async function MyRequestsPage() {
  const user = await currentAppUser()
  if (!user) redirect('/login')
  // Cooperative staff have their own inbox, which is the same rows read from
  // the other side; sending them there beats showing them an empty list.
  if (user.role !== 'buyer') redirect('/requests')

  // GET /api/supply-requests is scoped by session, and for a buyer that means
  // their own requests -- there is nothing to filter here.
  const [rows, commodities, cooperatives] = await Promise.all([
    loadSupplyRequests(),
    loadCommodities(),
    loadAtlasCooperativesIfUp(),
  ])

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader
        title="Permintaan Saya & Status Kontrak"
        description="Pantau status jawaban pengurus koperasi atas pengajuan kontrak pasokan Anda (Disetujui/ACC, Menunggu, atau Ditolak)."
        actions={
          <Link href="/catalog" className={buttonVariants({ variant: 'outline' })}>
            Jelajahi Katalog Pasokan
          </Link>
        }
      />

      <MyRequestsView
        requests={rows}
        commodities={commodities}
        cooperatives={cooperatives ?? []}
      />

      <p className="text-xs leading-relaxed text-muted-foreground border-t border-border pt-4">
        Terrion adalah penyedia sistem, bukan pihak dalam kontrak. Kesepakatan dan
        pengiriman diatur langsung antara Anda dan koperasi.
      </p>
    </Page>
  )
}

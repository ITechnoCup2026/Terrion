import { redirect } from 'next/navigation'

import { PlanWorkspace } from '@/components/plans/PlanWorkspace'
import { Page, PageHeader } from '@/components/ui/Page'
import { currentAppUser } from '@/lib/auth/session'

export const metadata = { title: 'Rencana tanam' }

export const dynamic = 'force-dynamic'

/**
 * Planning the season ahead.
 *
 * A kader may draw plans -- proposing costs nothing and stores nothing -- but
 * only a pengurus may apply one, because applying creates real blocks for the
 * whole cooperative. The backend enforces both; this only decides whether the
 * button is drawn.
 */
export default async function PlansPage() {
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (user.role !== 'kader' && user.role !== 'pengurus') redirect('/dashboard')

  return (
    <Page>
      <PageHeader
        title="Rencana tanam musim depan"
        description={
          'Melihat seluruh lahan koperasi sekaligus, lalu menyusun siapa menanam apa dan kapan '
          + 'supaya panen tersebar dan tidak menumpuk di satu minggu.'
        }
      />
      <div className="mt-6">
        <PlanWorkspace canApply={user.role === 'pengurus'} />
      </div>
    </Page>
  )
}
